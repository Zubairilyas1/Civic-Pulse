from app.config import settings
from app.providers.triage.base import BaseTriageProvider
from app.providers.triage.llm import LLMTriage
from app.providers.triage.ollama import OllamaTriage
from app.providers.triage.rules import RuleBasedTriage
from app.providers.triage.simulated import SimulatedTriage


class TriageFactory:
    """Factory for instantiating triage provider based on environment setting or explicit name."""

    @staticmethod
    def get_provider(provider_name: str | None = None) -> BaseTriageProvider:
        name = (provider_name or settings.TRIAGE_PROVIDER or "simulated").lower()

        if name in ["groq", "llm"]:
            return LLMTriage()
        elif name == "ollama":
            return OllamaTriage()
        elif name in ["rules", "rule_based"]:
            return RuleBasedTriage()
        elif name == "simulated":
            return SimulatedTriage()
        # Fallback to RuleBasedTriage if unknown
        return RuleBasedTriage()
