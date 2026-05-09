"""Pydantic models for the road_blocks collection."""
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class RoadBlockStatus(str, Enum):
    active = "active"
    cleared = "cleared"


class RoadBlockCreate(BaseModel):
    block_id: str
    road_name: str
    zone_id: str
    reason: str
    lat: float
    lon: float
    node_id: Optional[int] = None
    depth_at_block: float = 0.0
    blocked_by: str = "system"
    status: RoadBlockStatus = RoadBlockStatus.active
    broadcast_to: List[str] = Field(default_factory=list)


class RoadBlockUpdate(BaseModel):
    status: Optional[RoadBlockStatus] = None
    depth_at_block: Optional[float] = None
    cleared_at: Optional[datetime] = None
    broadcast_to: Optional[List[str]] = None


class RoadBlockInDB(RoadBlockCreate):
    blocked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cleared_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class RoadBlockResponse(RoadBlockInDB):
    class Config:
        from_attributes = True
