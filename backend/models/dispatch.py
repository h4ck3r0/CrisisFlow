"""Pydantic models for the dispatch_orders collection."""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class DispatchCreate(BaseModel):
    order_id: str
    resource_id: str
    resource_type: str
    target_zone_id: str
    target_ward: str
    reason: str
    priority: int = Field(ge=1, le=5, default=3)
    status: str = "pending"
    dispatched_by: str = "government"
    eta_minutes: int = 0


class DispatchUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    eta_minutes: Optional[int] = None
    completed_at: Optional[datetime] = None


class DispatchInDB(DispatchCreate):
    dispatched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class DispatchResponse(DispatchInDB):
    class Config:
        from_attributes = True