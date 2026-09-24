from fastapi import APIRouter

from app.schemas.stats import StatsResponse
from app.services.stats_service import StatsService

router = APIRouter(tags=["Stats"])
stats_service = StatsService()


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Retrieve aggregated stats and breakdown counters."""
    return await stats_service.get_stats()
