import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.triage.factory import TriageFactory
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)
from app.services.state_machine import ComplaintStateMachine, InvalidStateTransitionException

logger = logging.getLogger("civicpulse.complaint_service")


class ComplaintService:
    """Service layer orchestrating complaint business logic, state machine, and AI triage."""

    def __init__(self, repository: Optional[ComplaintRepository] = None):
        self.repository = repository or ComplaintRepository()

    async def create_complaint(
        self, complaint: ComplaintCreate, session: Optional[AsyncSession] = None
    ) -> ComplaintResponse:
        """Create new complaint and automatically execute AI triage pipeline."""
        triage_result = None
        try:
            provider = TriageFactory.get_provider()
            triage_result = await provider.triage(
                title=complaint.title, description=complaint.description
            )
            logger.info(
                f"Auto-triage successful for complaint '{complaint.title}' via provider '{triage_result.triaged_by}'"
            )
        except Exception as e:
            logger.warning(f"Auto-triage pipeline failed or degraded: {str(e)}")

        return await self.repository.create(
            complaint, triage_result=triage_result, session=session
        )

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
        complaint = await self.get_complaint(complaint_id, session=session)
        if not complaint:
            raise ValueError(f"Complaint '{complaint_id}' not found.")

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
