from typing import List, Optional
from datetime import datetime
import uuid

from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)

# In-memory storage placeholder before database migration in Day 2
_in_memory_db: dict[str, ComplaintResponse] = {}


class ComplaintRepository:
    """Repository layer for managing Complaint CRUD operations."""

    async def create(self, complaint: ComplaintCreate) -> ComplaintResponse:
        complaint_id = str(uuid.uuid4())
        now = datetime.utcnow()

        db_item = ComplaintResponse(
            id=complaint_id,
            title=complaint.title,
            description=complaint.description,
            location=complaint.location,
            status=StatusEnum.SUBMITTED,
            category=None,
            priority=None,
            summary=None,
            triaged_by=None,
            created_at=now,
            updated_at=now,
        )
        _in_memory_db[complaint_id] = db_item
        return db_item

    async def get_by_id(self, complaint_id: str) -> Optional[ComplaintResponse]:
        return _in_memory_db.get(complaint_id)

    async def list_all(
        self,
        category: Optional[CategoryEnum] = None,
        priority: Optional[PriorityEnum] = None,
        status: Optional[StatusEnum] = None,
        skip: int = 0,
        limit: int = 10,
    ) -> List[ComplaintResponse]:
        items = list(_in_memory_db.values())

        if category:
            items = [i for i in items if i.category == category]
        if priority:
            items = [i for i in items if i.priority == priority]
        if status:
            items = [i for i in items if i.status == status]

        return items[skip : skip + limit]
