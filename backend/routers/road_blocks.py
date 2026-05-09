"""CRUD routes for /api/road-blocks."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from models.road_block import RoadBlockCreate, RoadBlockUpdate, RoadBlockInDB, RoadBlockResponse, RoadBlockStatus

router = APIRouter(prefix="/api/road-blocks", tags=["Road Blocks"])
NOT_DELETED = {"deleted_at": None}

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@router.get("", response_model=list[RoadBlockResponse])
async def list_road_blocks(
    status: Optional[RoadBlockStatus] = None, zone_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if status: query["status"] = status.value
    if zone_id: query["zone_id"] = zone_id
    cursor = db.road_blocks.find(query).sort("blocked_at", -1)
    return [_serialize(doc) async for doc in cursor]

@router.get("/{block_id}", response_model=RoadBlockResponse)
async def get_road_block(block_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.road_blocks.find_one({"block_id": block_id, **NOT_DELETED})
    if not doc: raise HTTPException(404, "Road block not found")
    return _serialize(doc)

@router.post("", response_model=RoadBlockResponse, status_code=201)
async def create_road_block(body: RoadBlockCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = RoadBlockInDB(**body.model_dump())
    doc = record.model_dump()
    try: await db.road_blocks.insert_one(doc)
    except Exception: raise HTTPException(409, f"Road block {body.block_id} already exists")
    return _serialize(doc)

@router.patch("/{block_id}", response_model=RoadBlockResponse)
async def update_road_block(block_id: str, body: RoadBlockUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates: raise HTTPException(400, "No fields to update")
    if updates.get("status") == "cleared" and "cleared_at" not in updates:
        updates["cleared_at"] = datetime.now(timezone.utc)
    result = await db.road_blocks.find_one_and_update(
        {"block_id": block_id, **NOT_DELETED}, {"$set": updates}, return_document=True)
    if not result: raise HTTPException(404, "Road block not found")
    return _serialize(result)

@router.delete("/{block_id}")
async def delete_road_block(block_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.road_blocks.find_one_and_update(
        {"block_id": block_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}}, return_document=True)
    if not result: raise HTTPException(404, "Road block not found")
    return {"status": "deleted", "block_id": block_id}
