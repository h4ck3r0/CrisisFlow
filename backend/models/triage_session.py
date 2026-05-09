"""Pydantic models for the triage_sessions collection."""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ThoughtEntry(BaseModel):
    event_type: str
    content: str
    tool_name: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TriageSessionCreate(BaseModel):
    session_id: str
    zones_input: List[Dict[str, Any]] = Field(default_factory=list)
    status: str = "running"


class TriageSessionUpdate(BaseModel):
    thoughts: Optional[List[Dict[str, Any]]] = None
    dispatch_count: Optional[int] = None
    population_covered: Optional[int] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class TriageSessionInDB(TriageSessionCreate):
    thoughts: List[Dict[str, Any]] = Field(default_factory=list)
    dispatch_count: int = 0
    population_covered: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class TriageSessionResponse(TriageSessionInDB):
    class Config:
        from_attributes = True
