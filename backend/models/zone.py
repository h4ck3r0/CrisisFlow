"""Pydantic models for the zones collection."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    critical = "critical"
    severe = "severe"
    high = "high"
    moderate = "moderate"


class ZoneCreate(BaseModel):
    zone_id: str
    ward_name: str
    depth_meters: float = 0.0
    area_sqkm: float = 0.0
    population_affected: int = 0
    has_hospital: bool = False
    has_school: bool = False
    road_accessibility: float = 1.0
    lat: float
    lng: float
    risk_level: RiskLevel = RiskLevel.moderate
    stgcn_confidence: float = 0.0


class ZoneUpdate(BaseModel):
    depth_meters: Optional[float] = None
    population_affected: Optional[int] = None
    road_accessibility: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    stgcn_confidence: Optional[float] = None


class ZoneInDB(ZoneCreate):
    prediction_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class ZoneResponse(ZoneInDB):
    class Config:
        from_attributes = True
