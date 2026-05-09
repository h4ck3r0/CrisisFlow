"""Pydantic models for the hospital_capacity collection."""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class HospitalCreate(BaseModel):
    hospital_id: str
    hospital_name: str
    zone_id: str
    general_beds_available: int = 0
    general_beds_total: int = 0
    icu_beds_available: int = 0
    icu_beds_total: int = 0
    emergency_beds_available: int = 0
    emergency_beds_total: int = 0
    ambulances_available: int = 0
    ambulances_total: int = 0
    blood_o_positive: int = 0
    iv_fluids_bags: int = 0
    tetanus_doses: int = 0


class HospitalUpdate(BaseModel):
    general_beds_available: Optional[int] = None
    icu_beds_available: Optional[int] = None
    emergency_beds_available: Optional[int] = None
    ambulances_available: Optional[int] = None
    blood_o_positive: Optional[int] = None
    iv_fluids_bags: Optional[int] = None
    tetanus_doses: Optional[int] = None


class HospitalInDB(HospitalCreate):
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None


class HospitalResponse(HospitalInDB):
    class Config:
        from_attributes = True
