"""Pydantic models for the citizen_reports collection."""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class CitizenReportCreate(BaseModel):
    report_id: str
    zone_id: str
    ward_name: str
    description: str
    photo_url: Optional[str] = None
    gemini_depth_estimate: Optional[float] = None
    gemini_confidence: Optional[float] = None
    verified: bool = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    report_to: str = "government"


class CitizenReportUpdate(BaseModel):
    description: Optional[str] = None
    photo_url: Optional[str] = None
    gemini_depth_estimate: Optional[float] = None
    gemini_confidence: Optional[float] = None
    verified: Optional[bool] = None
    report_to: Optional[str] = None


class CitizenReportInDB(CitizenReportCreate):
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class CitizenReportResponse(CitizenReportInDB):
    class Config:
        from_attributes = True
