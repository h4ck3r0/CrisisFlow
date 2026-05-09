"""CRUD routes for /api/hospitals."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from models.hospital import HospitalCreate, HospitalUpdate, HospitalInDB, HospitalResponse

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])
NOT_DELETED = {"deleted_at": None}

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@router.get("", response_model=list[HospitalResponse])
async def list_hospitals(zone_id: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db)):
    query = {**NOT_DELETED}
    if zone_id: query["zone_id"] = zone_id
    cursor = db.hospital_capacity.find(query)
    return [_serialize(doc) async for doc in cursor]

@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(hospital_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.hospital_capacity.find_one({"hospital_id": hospital_id, **NOT_DELETED})
    if not doc: raise HTTPException(404, "Hospital not found")
    return _serialize(doc)

@router.post("", response_model=HospitalResponse, status_code=201)
async def create_hospital(body: HospitalCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = HospitalInDB(**body.model_dump())
    doc = record.model_dump()
    try: await db.hospital_capacity.insert_one(doc)
    except Exception: raise HTTPException(409, f"Hospital {body.hospital_id} already exists")
    return _serialize(doc)

@router.patch("/{hospital_id}", response_model=HospitalResponse)
async def update_hospital(hospital_id: str, body: HospitalUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates: raise HTTPException(400, "No fields to update")
    updates["last_updated"] = datetime.now(timezone.utc)
    result = await db.hospital_capacity.find_one_and_update(
        {"hospital_id": hospital_id, **NOT_DELETED}, {"$set": updates}, return_document=True)
    if not result: raise HTTPException(404, "Hospital not found")
    return _serialize(result)

@router.delete("/{hospital_id}")
async def delete_hospital(hospital_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.hospital_capacity.find_one_and_update(
        {"hospital_id": hospital_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}}, return_document=True)
    if not result: raise HTTPException(404, "Hospital not found")
    return {"status": "deleted", "hospital_id": hospital_id}
