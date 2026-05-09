"""CRUD routes for /api/dispatches."""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from models.dispatch import (
    DispatchCreate, DispatchUpdate, DispatchInDB, DispatchResponse,
)

router = APIRouter(prefix="/api/dispatches", tags=["Dispatches"])

NOT_DELETED = {"deleted_at": None}


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("", response_model=list[DispatchResponse])
async def list_dispatches(
    status: Optional[str] = None,
    zone_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {**NOT_DELETED}
    if status:
        query["status"] = status
    if zone_id:
        query["target_zone_id"] = zone_id
    cursor = db.dispatch_orders.find(query).sort("dispatched_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{order_id}", response_model=DispatchResponse)
async def get_dispatch(order_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.dispatch_orders.find_one({"order_id": order_id, **NOT_DELETED})
    if not doc:
        raise HTTPException(404, "Dispatch order not found")
    return _serialize(doc)


@router.post("", response_model=DispatchResponse, status_code=201)
async def create_dispatch(body: DispatchCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    record = DispatchInDB(**body.model_dump())
    doc = record.model_dump()
    try:
        await db.dispatch_orders.insert_one(doc)
    except Exception:
        raise HTTPException(409, f"Dispatch {body.order_id} already exists")
    # Mark the resource as deployed
    await db.resources.update_one(
        {"resource_id": body.resource_id},
        {"$set": {"status": "deployed", "current_zone_id": body.target_zone_id,
                  "last_updated": datetime.now(timezone.utc)}},
    )
    return _serialize(doc)


@router.patch("/{order_id}", response_model=DispatchResponse)
async def update_dispatch(
    order_id: str,
    body: DispatchUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    # Auto-set completed_at when status becomes complete
    if updates.get("status") == "complete" and "completed_at" not in updates:
        updates["completed_at"] = datetime.now(timezone.utc)
    result = await db.dispatch_orders.find_one_and_update(
        {"order_id": order_id, **NOT_DELETED},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Dispatch order not found")
    # If completed or cancelled, free the resource
    if updates.get("status") in ("complete", "cancelled"):
        await db.resources.update_one(
            {"resource_id": result["resource_id"]},
            {"$set": {"status": "available", "current_zone_id": None,
                      "last_updated": datetime.now(timezone.utc)}},
        )
    return _serialize(result)


@router.delete("/{order_id}")
async def delete_dispatch(order_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await db.dispatch_orders.find_one_and_update(
        {"order_id": order_id, **NOT_DELETED},
        {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Dispatch order not found")
    return {"status": "deleted", "order_id": order_id}
