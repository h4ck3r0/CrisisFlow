"""Pydantic models for the incidents collection."""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

class IncidentCreate(BaseModel):
    incident_id: str
    incident_type: str
    zone_id: str
    location_name: str
    assigned_resources: List[str] = Field(default_factory=list)
    status: str = "active"
    severity: str = "moderate"
    notes: str = ""


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_resources: Optional[List[str]] = None
    notes: Optional[str] = None
    resolved_at: Optional[datetime] = None


class IncidentInDB(IncidentCreate):
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class IncidentResponse(IncidentInDB):
    class Config:
        from_attributes = True
