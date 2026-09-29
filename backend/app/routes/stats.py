from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.stats import StatsResponse
from app.services.stats_service import StatsService

router = APIRouter(tags=["Stats"])
stats_service = StatsService()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> StatsResponse:
    """Retrieve aggregated stats with X-Cache response header."""
    stats, cache_status = await stats_service.get_stats_with_cache_status(session=session)
    response.headers["X-Cache"] = cache_status
    return stats
