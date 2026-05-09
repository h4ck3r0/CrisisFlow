"""CRUD routes for /api/incidents."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from models.incident import (
    IncidentCreate, IncidentUpdate, IncidentInDB, IncidentResponse,
)

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])
NOT_DELETED = {"deleted_at": None}

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@router.get("", response_model=list[IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    zone_id: Optional[str] = None,
    incident_type: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if status: query["status"] = status
    if zone_id: query["zone_id"] = zone_id
    if incident_type: query["incident_type"] = incident_type
    cursor = db.incidents.find(query).sort("reported_at", -1)
    return [_serialize(doc) async for doc in cursor]

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.incidents.find_one({"incident_id": incident_id, **NOT_DELETED})
    if not doc: raise HTTPException(404, "Incident not found")
    return _serialize(doc)

@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(body: IncidentCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = IncidentInDB(**body.model_dump())
    doc = record.model_dump()
    try: await db.incidents.insert_one(doc)
    except Exception: raise HTTPException(409, f"Incident {body.incident_id} already exists")
    return _serialize(doc)

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(incident_id: str, body: IncidentUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates: raise HTTPException(400, "No fields to update")
    if updates.get("status") == "resolved" and "resolved_at" not in updates:
        updates["resolved_at"] = datetime.now(timezone.utc)
    result = await db.incidents.find_one_and_update(
        {"incident_id": incident_id, **NOT_DELETED}, {"$set": updates}, return_document=True)
    if not result: raise HTTPException(404, "Incident not found")
    return _serialize(result)

@router.delete("/{incident_id}")
async def delete_incident(incident_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.incidents.find_one_and_update(
        {"incident_id": incident_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}}, return_document=True)
    if not result: raise HTTPException(404, "Incident not found")
    return {"status": "deleted", "incident_id": incident_id}
