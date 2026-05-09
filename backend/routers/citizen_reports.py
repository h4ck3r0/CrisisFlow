"""CRUD routes for /api/citizen-reports — also handles user reports from the frontend."""
from datetime import datetime, timezone
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from database import get_db
from models.citizen_report import (
    CitizenReportCreate, CitizenReportUpdate, CitizenReportInDB, CitizenReportResponse,
)

router = APIRouter(prefix="/api/citizen-reports", tags=["Citizen Reports"])

NOT_DELETED = {"deleted_at": None}


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


class QuickReportRequest(BaseModel):
    """Simplified report submission from the frontend / WhatsApp bot."""
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    zone_id: Optional[str] = None
    ward_name: Optional[str] = None
    photo_url: Optional[str] = None
    report_to: Optional[str] = "government"  # "government", "police", or "hospital"


@router.get("", response_model=list[CitizenReportResponse])
async def list_reports(
    zone_id: Optional[str] = None,
    verified: Optional[bool] = None,
    report_to: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if zone_id:
        query["zone_id"] = zone_id
    if verified is not None:
        query["verified"] = verified
    if report_to:
        query["report_to"] = report_to
    cursor = db.citizen_reports.find(query).sort("reported_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{report_id}", response_model=CitizenReportResponse)
async def get_report(report_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.citizen_reports.find_one({"report_id": report_id, **NOT_DELETED})
    if not doc:
        raise HTTPException(404, "Report not found")
    return _serialize(doc)


@router.post("", response_model=CitizenReportResponse, status_code=201)
async def create_report(body: CitizenReportCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = CitizenReportInDB(**body.model_dump())
    doc = record.model_dump()
    try:
        await db.citizen_reports.insert_one(doc)
    except Exception:
        raise HTTPException(409, f"Report {body.report_id} already exists")
    return _serialize(doc)


@router.post("/quick", response_model=CitizenReportResponse, status_code=201)
async def quick_report(body: QuickReportRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Simplified endpoint for citizens to submit reports without knowing report_id format.
    Auto-generates IDs and infers zone from coordinates when possible.
    """
    report_id = f"CR-{uuid.uuid4().hex[:8].upper()}"

    # If zone_id not provided, try to infer from coordinates
    zone_id = body.zone_id or "unknown"
    ward_name = body.ward_name or "Unknown Ward"

    if body.lat and body.lng and zone_id == "unknown":
        # Simple proximity check against known zones
        zones_cursor = db.zones.find({"deleted_at": None})
        best_zone = None
        best_dist = float("inf")
        async for z in zones_cursor:
            dist = abs(z["lat"] - body.lat) + abs(z["lng"] - body.lng)
            if dist < best_dist:
                best_dist = dist
                best_zone = z
        if best_zone and best_dist < 0.05:  # ~5km rough threshold
            zone_id = best_zone["zone_id"]
            ward_name = best_zone["ward_name"]

    # Validate report_to value
    valid_targets = ("government", "police", "hospital")
    report_to_val = body.report_to if body.report_to in valid_targets else "government"

    record = CitizenReportInDB(
        report_id=report_id,
        zone_id=zone_id,
        ward_name=ward_name,
        description=body.description,
        photo_url=body.photo_url,
        lat=body.lat,
        lng=body.lng,
        report_to=report_to_val,
    )
    doc = record.model_dump()
    await db.citizen_reports.insert_one(doc)
    return _serialize(doc)


@router.patch("/{report_id}", response_model=CitizenReportResponse)
async def update_report(
    report_id: str,
    body: CitizenReportUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.citizen_reports.find_one_and_update(
        {"report_id": report_id, **NOT_DELETED},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Report not found")
    return _serialize(result)


@router.delete("/{report_id}")
async def delete_report(report_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.citizen_reports.find_one_and_update(
        {"report_id": report_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Report not found")
    return {"status": "deleted", "report_id": report_id}
