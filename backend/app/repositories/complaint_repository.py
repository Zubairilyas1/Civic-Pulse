import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.complaint import Complaint
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
    TriageResult,
)
from app.schemas.stats import StatsResponse

# In-memory storage fallback when DB session is not active
_in_memory_db: dict[str, ComplaintResponse] = {}


class ComplaintRepository:
    """Repository layer managing SQL database access and in-memory fallback for complaints."""

    async def create(
        self,
        complaint: ComplaintCreate,
        triage_result: TriageResult | None = None,
        session: AsyncSession | None = None,
    ) -> ComplaintResponse:
        complaint_id = str(uuid.uuid4())
        now = datetime.now()

        status = StatusEnum.TRIAGED if triage_result else StatusEnum.SUBMITTED
        category = triage_result.category if triage_result else None
        priority = triage_result.priority if triage_result else None
        summary = triage_result.summary if triage_result else None
        triaged_by = triage_result.triaged_by if triage_result else None

        if session:
            db_item = Complaint(
                id=complaint_id,
                title=complaint.title,
                description=complaint.description,
                location=complaint.location,
                status=status,
                category=category,
                priority=priority,
                summary=summary,
                triaged_by=triaged_by,
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
            status=status,
            category=category,
            priority=priority,
            summary=summary,
            triaged_by=triaged_by,
            created_at=now,
            updated_at=now,
        )
        _in_memory_db[complaint_id] = res
        return res

    async def get_by_id(self, complaint_id: str, session: AsyncSession | None = None) -> ComplaintResponse | None:
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
        session: AsyncSession | None = None,
    ) -> ComplaintResponse | None:
        now = datetime.now()

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
            updated_item = item.model_copy(update={"status": new_status, "updated_at": now})
            _in_memory_db[complaint_id] = updated_item
            return updated_item
        return None

    async def get_stats(self, session: AsyncSession | None = None) -> StatsResponse:
        if session:
            total_stmt = select(func.count(Complaint.id))
            total_res = await session.execute(total_stmt)
            total = total_res.scalar_one() or 0

            status_stmt = select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)
            status_res = await session.execute(status_stmt)
            by_status = {s.value: count for s, count in status_res.all()}

            cat_stmt = select(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category)
            cat_res = await session.execute(cat_stmt)
            by_category = {c.value if c else "UNASSIGNED": count for c, count in cat_res.all()}

            pri_stmt = select(Complaint.priority, func.count(Complaint.id)).group_by(Complaint.priority)
            pri_res = await session.execute(pri_stmt)
            by_priority = {p.value if p else "UNASSIGNED": count for p, count in pri_res.all()}

            return StatsResponse(
                total_complaints=total,
                by_status=by_status,
                by_category=by_category,
                by_priority=by_priority,
            )

        items = list(_in_memory_db.values())
        mem_status: dict[str, int] = {}
        mem_category: dict[str, int] = {}
        mem_priority: dict[str, int] = {}

        for item in items:
            s = item.status.value
            mem_status[s] = mem_status.get(s, 0) + 1

            c = item.category.value if item.category else "UNASSIGNED"
            mem_category[c] = mem_category.get(c, 0) + 1

            p = item.priority.value if item.priority else "UNASSIGNED"
            mem_priority[p] = mem_priority.get(p, 0) + 1

        return StatsResponse(
            total_complaints=len(items),
            by_status=mem_status,
            by_category=mem_category,
            by_priority=mem_priority,
        )

    async def list_all(
        self,
        category: CategoryEnum | None = None,
        priority: PriorityEnum | None = None,
        status: StatusEnum | None = None,
        skip: int = 0,
        limit: int = 10,
        session: AsyncSession | None = None,
    ) -> list[ComplaintResponse]:
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
            db_items = result.scalars().all()
            return [ComplaintResponse.model_validate(item) for item in db_items]

        mem_items = list(_in_memory_db.values())
        if category:
            mem_items = [i for i in mem_items if i.category == category]
        if priority:
            mem_items = [i for i in mem_items if i.priority == priority]
        if status:
            mem_items = [i for i in mem_items if i.status == status]

        return mem_items[skip : skip + limit]
