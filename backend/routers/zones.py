"""CRUD routes for /api/zones."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.zone import ZoneCreate, ZoneUpdate, ZoneInDB, ZoneResponse, RiskLevel

router = APIRouter(prefix="/api/zones", tags=["Zones"])

NOT_DELETED = {"deleted_at": None}


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("", response_model=list[ZoneResponse])
async def list_zones(
    risk_level: Optional[RiskLevel] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if risk_level:
        query["risk_level"] = risk_level.value
    cursor = db.zones.find(query)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(zone_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.zones.find_one({"zone_id": zone_id, **NOT_DELETED})
    if not doc:
        raise HTTPException(404, "Zone not found")
    return _serialize(doc)


@router.post("", response_model=ZoneResponse, status_code=201)
async def create_zone(body: ZoneCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = ZoneInDB(**body.model_dump())
    doc = record.model_dump()
    try:
        await db.zones.insert_one(doc)
    except Exception:
        raise HTTPException(409, f"Zone {body.zone_id} already exists")
    return _serialize(doc)


@router.patch("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: str,
    body: ZoneUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["prediction_timestamp"] = datetime.now(timezone.utc)
    result = await db.zones.find_one_and_update(
        {"zone_id": zone_id, **NOT_DELETED},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Zone not found")
    return _serialize(result)


@router.delete("/{zone_id}")
async def delete_zone(zone_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.zones.find_one_and_update(
        {"zone_id": zone_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Zone not found")
    return {"status": "deleted", "zone_id": zone_id}
