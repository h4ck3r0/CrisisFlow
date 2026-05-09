"""CRUD routes for /api/alerts."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.alert import AlertCreate, AlertUpdate, AlertInDB, AlertResponse, AlertSeverity

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

NOT_DELETED = {"deleted_at": None}


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    zone_id: Optional[str] = None,
    severity: Optional[AlertSeverity] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if zone_id:
        query["zone_id"] = zone_id
    if severity:
        query["severity"] = severity.value
    cursor = db.alerts.find(query).sort("sent_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.alerts.find_one({"alert_id": alert_id, **NOT_DELETED})
    if not doc:
        raise HTTPException(404, "Alert not found")
    return _serialize(doc)


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(body: AlertCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = AlertInDB(**body.model_dump())
    doc = record.model_dump()
    try:
        await db.alerts.insert_one(doc)
    except Exception:
        raise HTTPException(409, f"Alert {body.alert_id} already exists")
    return _serialize(doc)


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    body: AlertUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.alerts.find_one_and_update(
        {"alert_id": alert_id, **NOT_DELETED},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Alert not found")
    return _serialize(result)


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.alerts.find_one_and_update(
        {"alert_id": alert_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Alert not found")
    return {"status": "deleted", "alert_id": alert_id}
