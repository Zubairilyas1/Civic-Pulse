from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)
from app.services.state_machine import ComplaintStateMachine, InvalidStateTransitionException


class ComplaintService:
    """Service layer orchestrating complaint business logic and state machine enforcement."""

    def __init__(self, repository: Optional[ComplaintRepository] = None):
        self.repository = repository or ComplaintRepository()

    async def create_complaint(
        self, complaint: ComplaintCreate, session: Optional[AsyncSession] = None
    ) -> ComplaintResponse:
        return await self.repository.create(complaint, session=session)

    async def get_complaint(
        self, complaint_id: str, session: Optional[AsyncSession] = None
    ) -> Optional[ComplaintResponse]:
        return await self.repository.get_by_id(complaint_id, session=session)

    async def update_status(
        self,
        complaint_id: str,
        target_status: StatusEnum,
        session: Optional[AsyncSession] = None,
    ) -> ComplaintResponse:
        """Advance complaint status with state machine transition checks."""
        complaint = await self.get_complaint(complaint_id, session=session)
        if not complaint:
            raise ValueError(f"Complaint '{complaint_id}' not found.")

        # Validate transition using state machine
        ComplaintStateMachine.validate_transition(
            current_status=complaint.status, target_status=target_status
        )

        updated = await self.repository.update_status(
            complaint_id, target_status, session=session
        )
        if not updated:
            raise ValueError(f"Failed to update complaint '{complaint_id}'.")
        return updated

    async def list_complaints(
        self,
        category: Optional[CategoryEnum] = None,
        priority: Optional[PriorityEnum] = None,
        status: Optional[StatusEnum] = None,
        skip: int = 0,
        limit: int = 10,
        session: Optional[AsyncSession] = None,
    ) -> List[ComplaintResponse]:
        return await self.repository.list_all(
            category=category,
            priority=priority,
            status=status,
            skip=skip,
            limit=limit,
            session=session,
        )
