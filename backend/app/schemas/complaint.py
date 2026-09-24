from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CategoryEnum(str, Enum):
    WATER = "WATER"
    ROADS = "ROADS"
    ELECTRICITY = "ELECTRICITY"
    WASTE = "WASTE"
    SANITATION = "SANITATION"
    OTHER = "OTHER"


class StatusEnum(str, Enum):
    SUBMITTED = "SUBMITTED"
    TRIAGED = "TRIAGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class ComplaintBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=150, description="Title of the complaint")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description")
    location: str = Field(..., min_length=3, max_length=200, description="Physical location or neighborhood")


class ComplaintCreate(ComplaintBase):
    pass


class StatusUpdate(BaseModel):
    status: StatusEnum
    notes: Optional[str] = Field(None, max_length=500)


class TriageResult(BaseModel):
    category: CategoryEnum
    priority: PriorityEnum
    summary: str
    triaged_by: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class ComplaintResponse(ComplaintBase):
    id: str
    status: StatusEnum
    category: Optional[CategoryEnum] = None
    priority: Optional[PriorityEnum] = None
    summary: Optional[str] = None
    triaged_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
