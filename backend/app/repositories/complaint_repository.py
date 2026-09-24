from typing import List, Optional
from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.models.complaint import Complaint
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)

# In-memory storage fallback when DB session is not active
_in_memory_db: dict[str, ComplaintResponse] = {}


class ComplaintRepository:
    """Repository layer managing SQL database access and in-memory fallback for complaints."""

    async def create(
        self, complaint: ComplaintCreate, session: Optional[AsyncSession] = None
    ) -> ComplaintResponse:
        complaint_id = str(uuid.uuid4())
        now = datetime.utcnow()

        if session:
            db_item = Complaint(
                id=complaint_id,
                title=complaint.title,
                description=complaint.description,
                location=complaint.location,
                status=StatusEnum.SUBMITTED,
                created_at=now,
                updated_at=now,
            )
            session.add(db_item)
            await session.commit()
            await session.refresh(db_item)
            return ComplaintResponse.model_validate(db_item)

        # Fallback in-memory behavior
        res = ComplaintResponse(
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
        _in_memory_db[complaint_id] = res
        return res

    async def get_by_id(
        self, complaint_id: str, session: Optional[AsyncSession] = None
    ) -> Optional[ComplaintResponse]:
        if session:
            stmt = select(Complaint).where(Complaint.id == complaint_id)
            result = await session.execute(stmt)
            db_item = result.scalar_one_or_none()
            return ComplaintResponse.model_validate(db_item) if db_item else None

        return _in_memory_db.get(complaint_id)

    async def update_status(
        self,
        complaint_id: str,
        new_status: StatusEnum,
        session: Optional[AsyncSession] = None,
    ) -> Optional[ComplaintResponse]:
        now = datetime.utcnow()

        if session:
            stmt = (
                update(Complaint)
                .where(Complaint.id == complaint_id)
                .values(status=new_status, updated_at=now)
                .execution_options(synchronize_session="fetch")
            )
            await session.execute(stmt)
            await session.commit()
            return await self.get_by_id(complaint_id, session=session)

        if complaint_id in _in_memory_db:
            item = _in_memory_db[complaint_id]
            updated_item = item.model_copy(
                update={"status": new_status, "updated_at": now}
            )
            _in_memory_db[complaint_id] = updated_item
            return updated_item
        return None

    async def list_all(
        self,
        category: Optional[CategoryEnum] = None,
        priority: Optional[PriorityEnum] = None,
        status: Optional[StatusEnum] = None,
        skip: int = 0,
        limit: int = 10,
        session: Optional[AsyncSession] = None,
    ) -> List[ComplaintResponse]:
        if session:
            query = select(Complaint)
            if category:
                query = query.where(Complaint.category == category)
            if priority:
                query = query.where(Complaint.priority == priority)
            if status:
                query = query.where(Complaint.status == status)

            query = query.offset(skip).limit(limit).order_by(Complaint.created_at.desc())
            result = await session.execute(query)
            items = result.scalars().all()
            return [ComplaintResponse.model_validate(item) for item in items]

        # In-memory fallback filtering
        items = list(_in_memory_db.values())
        if category:
            items = [i for i in items if i.category == category]
        if priority:
            items = [i for i in items if i.priority == priority]
        if status:
            items = [i for i in items if i.status == status]

        return items[skip : skip + limit]
