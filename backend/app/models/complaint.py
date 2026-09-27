import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.schemas.complaint import CategoryEnum, PriorityEnum, StatusEnum


class Complaint(Base):
    """SQLAlchemy ORM Model for Civic Complaints."""

    __tablename__ = "complaints"
    __table_args__ = (
        Index("idx_status_created_at", "status", "created_at"),
        Index("idx_category_priority", "category", "priority"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)

    status: Mapped[StatusEnum] = mapped_column(
        SQLEnum(StatusEnum), default=StatusEnum.SUBMITTED, nullable=False, index=True
    )
    category: Mapped[CategoryEnum] = mapped_column(SQLEnum(CategoryEnum), nullable=True, index=True)
    priority: Mapped[PriorityEnum] = mapped_column(SQLEnum(PriorityEnum), nullable=True, index=True)

    summary: Mapped[str] = mapped_column(Text, nullable=True)
    triaged_by: Mapped[str] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
