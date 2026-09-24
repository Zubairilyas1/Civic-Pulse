import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.redis import RedisService
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.stats import ProviderInfo, ProvidersMetaResponse, StatsResponse


class StatsService:
    """Service layer handling statistics calculations, Redis 30s TTL caching, and provider metadata."""

    STATS_CACHE_KEY = "civicpulse:cache:stats"
    CACHE_TTL = 30  # 30 seconds TTL

    def __init__(self, repository: ComplaintRepository | None = None):
        self.repository = repository or ComplaintRepository()

    async def get_stats_with_cache_status(self, session: AsyncSession | None = None) -> tuple[StatsResponse, str]:
        """Fetch stats with Redis caching. Returns (StatsResponse, cache_status) where cache_status is 'HIT' or 'MISS'."""
        cached_json = await RedisService.get(self.STATS_CACHE_KEY)
        if cached_json:
            data = json.loads(cached_json)
            return StatsResponse(**data), "HIT"

        # Cache MISS: fetch fresh from database
        stats = await self.repository.get_stats(session=session)
        await RedisService.set(self.STATS_CACHE_KEY, stats.model_dump_json(), ex=self.CACHE_TTL)
        return stats, "MISS"

    async def invalidate_stats_cache(self) -> None:
        """Purge stats cache on new complaint write."""
        await RedisService.delete(self.STATS_CACHE_KEY)

    async def get_provider_metadata(self) -> ProvidersMetaResponse:
        """Return operational status and metadata of all 4 supported AI Triage providers."""
        providers = [
            ProviderInfo(
                name="simulated",
                enabled=True,
                description="Seeded simulated response provider for deterministic testing",
            ),
            ProviderInfo(
                name="rules",
                enabled=True,
                description="Fast keyword & rule-based pattern matching triage provider",
            ),
            ProviderInfo(
                name="groq",
                enabled=bool(settings.GROQ_API_KEY),
                description="Groq Llama 3 70B Cloud LLM with structured output",
            ),
            ProviderInfo(
                name="ollama",
                enabled=bool(settings.OLLAMA_HOST),
                description="Local Ollama LLM provider",
            ),
        ]

        return ProvidersMetaResponse(
            active_provider=settings.TRIAGE_PROVIDER,
            available_providers=providers,
        )
