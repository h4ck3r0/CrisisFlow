"""CRUD routes for /api/resources."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.resource import (
    ResourceCreate, ResourceUpdate, ResourceInDB, ResourceResponse,
    ResourceType, ResourceStatus,
)

router = APIRouter(prefix="/api/resources", tags=["Resources"])

NOT_DELETED = {"deleted_at": None}


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("", response_model=list[ResourceResponse])
async def list_resources(
    status: Optional[ResourceStatus] = None,
    zone_id: Optional[str] = None,
    resource_type: Optional[ResourceType] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if status:
        query["status"] = status.value
    if zone_id:
        query["current_zone_id"] = zone_id
    if resource_type:
        query["resource_type"] = resource_type.value
    cursor = db.resources.find(query)
    return [_serialize(doc) async for doc in cursor]


@router.get("/available", response_model=list[ResourceResponse])
async def list_available(
    type: Optional[ResourceType] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED, "status": "available"}
    if type:
        query["resource_type"] = type.value
    cursor = db.resources.find(query)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.resources.find_one({"resource_id": resource_id, **NOT_DELETED})
    if not doc:
        raise HTTPException(404, "Resource not found")
    return _serialize(doc)


@router.post("", response_model=ResourceResponse, status_code=201)
async def create_resource(body: ResourceCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = ResourceInDB(**body.model_dump())
    doc = record.model_dump()
    try:
        await db.resources.insert_one(doc)
    except Exception:
        raise HTTPException(409, f"Resource {body.resource_id} already exists")
    return _serialize(doc)


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: str,
    body: ResourceUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["last_updated"] = datetime.now(timezone.utc)
    result = await db.resources.find_one_and_update(
        {"resource_id": resource_id, **NOT_DELETED},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Resource not found")
    return _serialize(result)


@router.delete("/{resource_id}")
async def delete_resource(resource_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.resources.find_one_and_update(
        {"resource_id": resource_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Resource not found")
    return {"status": "deleted", "resource_id": resource_id}
