from fastapi import APIRouter
from app.schemas.stats import ProvidersMetaResponse
from app.services.stats_service import StatsService

router = APIRouter(prefix="/meta", tags=["Metadata"])
stats_service = StatsService()


@router.get("/providers", response_model=ProvidersMetaResponse)
async def get_providers_metadata():
    """Retrieve metadata and operational status of all AI Triage providers."""
    return await stats_service.get_provider_metadata()
