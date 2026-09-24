from datetime import datetime
import uuid
from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.schemas.complaint import PriorityEnum, CategoryEnum, StatusEnum


class Complaint(Base):
    """SQLAlchemy ORM Model for Civic Complaints."""

    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)

    status: Mapped[StatusEnum] = mapped_column(
        SQLEnum(StatusEnum), default=StatusEnum.SUBMITTED, nullable=False, index=True
    )
    category: Mapped[CategoryEnum] = mapped_column(
        SQLEnum(CategoryEnum), nullable=True, index=True
    )
    priority: Mapped[PriorityEnum] = mapped_column(
        SQLEnum(PriorityEnum), nullable=True, index=True
    )

    summary: Mapped[str] = mapped_column(Text, nullable=True)
    triaged_by: Mapped[str] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
