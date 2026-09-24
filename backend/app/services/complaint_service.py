from typing import List, Optional
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)


class ComplaintService:
    """Service layer orchestrating complaint business logic."""

    def __init__(self, repository: Optional[ComplaintRepository] = None):
        self.repository = repository or ComplaintRepository()

    async def create_complaint(self, complaint: ComplaintCreate) -> ComplaintResponse:
        return await self.repository.create(complaint)

    async def get_complaint(self, complaint_id: str) -> Optional[ComplaintResponse]:
        return await self.repository.get_by_id(complaint_id)

    async def list_complaints(
        self,
        category: Optional[CategoryEnum] = None,
        priority: Optional[PriorityEnum] = None,
        status: Optional[StatusEnum] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[ComplaintResponse]:
        return await self.repository.list_all(
            category=category,
            priority=priority,
            status=status,
            skip=skip,
            limit=limit,
        )
