"""Pydantic models for the resources collection."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ResourceType(str, Enum):
    ambulance = "ambulance"
    pump = "pump"
    rescue_boat = "rescue_boat"
    fire_engine = "fire_engine"
    ndrf_team = "ndrf_team"
    police_unit = "police_unit"


class ResourceStatus(str, Enum):
    available = "available"
    deployed = "deployed"
    maintenance = "maintenance"
    offline = "offline"


class OwnerRole(str, Enum):
    hospital = "hospital"
    fire = "fire"
    police = "police"
    government = "government"


class ResourceCreate(BaseModel):
    resource_id: str
    resource_type: ResourceType
    name: str
    capacity: int = 1
    status: ResourceStatus = ResourceStatus.available
    current_zone_id: Optional[str] = None
    owner_role: OwnerRole
    home_station: str
    lat: float
    lng: float


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[ResourceStatus] = None
    current_zone_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class ResourceInDB(ResourceCreate):
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class ResourceResponse(ResourceInDB):
    class Config:
        from_attributes = True
