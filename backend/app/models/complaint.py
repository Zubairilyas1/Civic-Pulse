import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import DateTime, Index, Integer, String, Text, Uuid, text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.schemas.complaint import CategoryEnum, PriorityEnum, StatusEnum


def _contract_values(enum_cls: type[Enum]) -> list[str]:
    """Store the contract's lowercase VALUES in PostgreSQL, not the Python member names."""
    return [member.value for member in enum_cls]


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Complaint(Base):
    """SQLAlchemy ORM Model for Civic Complaints.

    Column names and types follow the contract's minimum schema (§2.3):
    UUID server-generated id, ``text`` (10–2000 chars, CHECK-enforced),
    ``reporter_contact``, ``ai_summary`` varchar(140), ``triage_latency_ms``,
    and timestamptz timestamps in UTC. Python attribute names stay idiomatic
    (`description`, `summary`) and map onto the contract columns.
    """

    __tablename__ = "complaints"
    __table_args__ = (
        Index("idx_status_created_at", "status", "created_at"),
        Index("idx_category_priority", "category", "priority"),
        Index("idx_status_priority", "status", "priority"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str] = mapped_column("text", Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    reporter_contact: Mapped[str | None] = mapped_column(String(200), nullable=True)

    status: Mapped[StatusEnum] = mapped_column(
        SQLEnum(StatusEnum, name="statusenum", values_callable=_contract_values),
        default=StatusEnum.OPEN,
        nullable=False,
        index=True,
    )
    category: Mapped[CategoryEnum | None] = mapped_column(
        SQLEnum(CategoryEnum, name="categoryenum", values_callable=_contract_values),
        nullable=True,
        index=True,
    )
    priority: Mapped[PriorityEnum | None] = mapped_column(
        SQLEnum(PriorityEnum, name="priorityenum", values_callable=_contract_values),
        nullable=True,
        index=True,
    )

    # Contract column is `ai_summary`: one line, <= 140 chars (CHECK-enforced).
    summary: Mapped[str | None] = mapped_column("ai_summary", String(140), nullable=True)
    triaged_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(nullable=True)
    triage_latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
