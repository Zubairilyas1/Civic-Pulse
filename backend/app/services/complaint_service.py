import logging
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.metrics import TRIAGE_DURATION_SECONDS, TRIAGE_FALLBACKS_TOTAL
from app.providers.triage.factory import TriageFactory
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)
from app.services.state_machine import ComplaintStateMachine
from app.services.stats_service import StatsService
from app.services.triage_log import TriageLog

logger = logging.getLogger("civicpulse.complaint_service")


class ComplaintService:
    """Service layer orchestrating complaint business logic, state machine, AI triage, and cache invalidation."""

    def __init__(self, repository: ComplaintRepository | None = None):
        self.repository = repository or ComplaintRepository()
        self.stats_service = StatsService(repository=self.repository)

    async def create_complaint(self, complaint: ComplaintCreate, session: AsyncSession) -> ComplaintResponse:
        triage_result = None
        triage_error: Exception | None = None
        # Contract §2.3: triage_latency_ms — measured for every attempt,
        # including attempts that end in a rules fallback or total failure.
        started = time.perf_counter()
        try:
            provider = TriageFactory.get_provider()
            triage_result = await provider.triage(title=complaint.title, description=complaint.description)
            logger.info(
                f"Auto-triage successful for complaint '{complaint.title}' via provider '{triage_result.triaged_by}'"
            )
        except Exception as e:
            triage_error = e
            logger.info(f"Auto-triage pipeline failed or degraded: {str(e)}")
        finally:
            triage_latency_ms = round((time.perf_counter() - started) * 1000)

        created = await self.repository.create(
            complaint,
            triage_result=triage_result,
            triage_latency_ms=triage_latency_ms,
            session=session,
        )

        # Contract §2.2 logging: exactly one WARNING per triage fallback, carrying
        # the complaint id, the provider and the error class. The id only exists
        # after persist, which is why this line lives here and not in the provider.
        is_fallback = triage_result is None or triage_result.triaged_by == "rules:fallback"
        error_detail = (
            f"{type(triage_error).__name__}: {triage_error}"
            if triage_error is not None
            else ((triage_result.fallback_reason or "unknown") if triage_result else "unknown")
        )
        error_class = error_detail.split(":", 1)[0] if is_fallback else None

        if is_fallback:
            logger.warning(
                f"Triage fallback complaint_id={created.id} provider={settings.TRIAGE_PROVIDER} "
                f"error_class={error_class} detail={error_detail}"
            )

        # Observability surface (§2.2): triage latency histogram, fallback counter,
        # and the ring buffer behind GET /api/meta/providers.
        provider_label = settings.TRIAGE_PROVIDER
        TRIAGE_DURATION_SECONDS.labels(provider=provider_label).observe(triage_latency_ms / 1000)
        if is_fallback:
            TRIAGE_FALLBACKS_TOTAL.labels(provider=provider_label).inc()
        TriageLog.record(
            complaint_id=str(created.id),
            provider=provider_label,
            latency_ms=triage_latency_ms,
            fallback=is_fallback,
            error_class=error_class,
        )

        # Invalidate Redis Stats Cache on write
        await self.stats_service.invalidate_stats_cache()
        return created

    async def get_complaint(self, complaint_id: str, session: AsyncSession) -> ComplaintResponse | None:
        return await self.repository.get_by_id(complaint_id, session=session)

    async def update_status(
        self,
        complaint_id: str,
        target_status: StatusEnum,
        session: AsyncSession,
    ) -> ComplaintResponse:
        complaint = await self.get_complaint(complaint_id, session=session)
        if not complaint:
            raise ValueError(f"Complaint '{complaint_id}' not found.")

        ComplaintStateMachine.validate_transition(current_status=complaint.status, target_status=target_status)

        updated = await self.repository.update_status(complaint_id, target_status, session=session)
        if not updated:
            raise ValueError(f"Failed to update complaint '{complaint_id}'.")

        # Invalidate Redis Stats Cache on status update
        await self.stats_service.invalidate_stats_cache()
        return updated

    async def list_complaints(
        self,
        category: CategoryEnum | None = None,
        priority: PriorityEnum | None = None,
        status: StatusEnum | None = None,
        page: int = 1,
        page_size: int = 10,
        *,
        session: AsyncSession,
    ) -> ComplaintListResponse:
        """One filtered page plus the total, so the UI can render real pagination controls."""
        offset = (page - 1) * page_size
        items = await self.repository.list_all(
            category=category,
            priority=priority,
            status=status,
            skip=offset,
            limit=page_size,
            session=session,
        )
        total = await self.repository.count_filtered(
            category=category,
            priority=priority,
            status=status,
            session=session,
        )
        return ComplaintListResponse(items=items, total=total, page=page, page_size=page_size)
