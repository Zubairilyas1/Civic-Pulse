from fastapi import APIRouter, Response
from app.schemas.stats import StatsResponse
from app.services.stats_service import StatsService

router = APIRouter(tags=["Stats"])
stats_service = StatsService()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(response: Response):
    """Retrieve aggregated stats with X-Cache response header."""
    stats, cache_status = await stats_service.get_stats_with_cache_status()
    response.headers["X-Cache"] = cache_status
    return stats
