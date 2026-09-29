from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PriorityEnum(str, Enum):
    """Contract priorities: high · normal · low (§2.3)."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class CategoryEnum(str, Enum):
    """Contract categories: water · electricity · sanitation · roads · streetlights · other (§2.3)."""

    WATER = "water"
    ROADS = "roads"
    ELECTRICITY = "electricity"
    STREETLIGHTS = "streetlights"
    SANITATION = "sanitation"
    OTHER = "other"


class StatusEnum(str, Enum):
    """Contract statuses: open · in_progress · resolved · rejected, default open (§2.3)."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class ComplaintBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=150, description="Title of the complaint")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description")
    location: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Physical location or neighborhood",
    )
    reporter_contact: str | None = Field(
        None,
        max_length=200,
        description="Optional contact detail for follow-up (contract column reporter_contact, nullable)",
    )


class ComplaintCreate(ComplaintBase):
    pass


class StatusUpdate(BaseModel):
    status: StatusEnum
    notes: str | None = Field(None, max_length=500)


class TriageResult(BaseModel):
    category: CategoryEnum
    priority: PriorityEnum
    # Contract §2.3: ai_summary is one line, <= 140 chars. Enforced here so a
    # misbehaving LLM raises ValidationError and the provider falls back to rules.
    summary: str = Field(..., max_length=140)
    triaged_by: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    # Carries "ErrorClass: detail" from an LLM provider that fell back to rules,
    # so the service can log the contract's single WARNING with the complaint id.
    fallback_reason: str | None = None

    @field_validator("summary", mode="before")
    @classmethod
    def _single_line(cls, value: Any) -> Any:
        if isinstance(value, str):
            return " ".join(value.splitlines())
        return value


class ComplaintResponse(ComplaintBase):
    id: str
    status: StatusEnum
    category: CategoryEnum | None = None
    priority: PriorityEnum | None = None
    summary: str | None = None
    triaged_by: str | None = None
    triage_latency_ms: int | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def _id_as_str(cls, value: Any) -> Any:
        return str(value)

    model_config = ConfigDict(from_attributes=True)


class ComplaintListResponse(BaseModel):
    """Contract for GET /api/complaints: a page of results plus the filtered total."""

    items: list[ComplaintResponse]
    total: int = Field(..., ge=0, description="Total complaints matching the filters, ignoring pagination")
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
