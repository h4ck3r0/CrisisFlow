"""Pydantic models for the alerts collection."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    evacuation = "evacuation"
    warning = "warning"
    info = "info"
    all_clear = "all_clear"


class AlertChannel(str, Enum):
    sms = "sms"
    whatsapp = "whatsapp"
    loudspeaker = "loudspeaker"
    push = "push"


class AlertCreate(BaseModel):
    alert_id: str
    zone_id: str
    ward_name: str
    message: str = Field(max_length=160)
    severity: AlertSeverity
    channel: AlertChannel = AlertChannel.sms
    recipients_count: int = 0
    sent_by: str = "system"


class AlertUpdate(BaseModel):
    message: Optional[str] = Field(default=None, max_length=160)
    acknowledged_count: Optional[int] = None


class AlertInDB(AlertCreate):
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_count: int = 0
    deleted_at: Optional[datetime] = None


class AlertResponse(AlertInDB):
    class Config:
        from_attributes = True
