from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.repositories.complaint_repository import ComplaintRepository
from app.schemas.stats import ProviderInfo, ProvidersMetaResponse, StatsResponse


class StatsService:
    """Service layer handling statistics calculations and provider metadata."""

    def __init__(self, repository: ComplaintRepository | None = None):
        self.repository = repository or ComplaintRepository()

    async def get_stats(self, session: AsyncSession | None = None) -> StatsResponse:
        """Fetch aggregated complaint counts."""
        return await self.repository.get_stats(session=session)

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
