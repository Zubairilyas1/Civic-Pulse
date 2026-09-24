import logging
import time

import httpx

from app.config import settings
from app.providers.triage.base import BaseTriageProvider
from app.providers.triage.rules import RuleBasedTriage
from app.schemas.complaint import CategoryEnum, PriorityEnum, TriageResult

logger = logging.getLogger("civicpulse.ollama_triage")


class OllamaTriage(BaseTriageProvider):
    """Local Ollama LLM Triage provider with latency metrics and fallback."""

    def __init__(self, fallback_provider: BaseTriageProvider | None = None):
        self.fallback_provider = fallback_provider or RuleBasedTriage()
        self.ollama_url = f"{settings.OLLAMA_HOST.rstrip('/')}/api/generate"

    async def _call_ollama(self, title: str, description: str) -> TriageResult:
        prompt = (
            f"You are a civic complaint classifier. Classify the following complaint.\n"
            f"Title: {title}\nDescription: {description}\n\n"
            f"Respond with JSON format containing keys 'category' (WATER, ROADS, ELECTRICITY, WASTE, SANITATION, OTHER), "
            f"'priority' (LOW, MEDIUM, HIGH, CRITICAL), and 'summary'."
        )

        payload = {
            "model": "llama3",
            "prompt": prompt,
            "format": "json",
            "stream": False,
        }

        start_time = time.perf_counter()

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(self.ollama_url, json=payload)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "{}")
                import json

                content = json.loads(response_text)

                category = CategoryEnum(content.get("category", "OTHER").upper())
                priority = PriorityEnum(content.get("priority", "MEDIUM").upper())
                summary = content.get("summary", f"Ollama triaged in {latency_ms}ms.")

                return TriageResult(
                    category=category,
                    priority=priority,
                    summary=summary,
                    triaged_by=f"ollama_llama3 ({latency_ms}ms)",
                    confidence_score=0.90,
                )

            raise RuntimeError(f"Ollama returned HTTP status {response.status_code}")

    async def triage(self, title: str, description: str) -> TriageResult:
        try:
            return await self._call_ollama(title, description)
        except Exception as exc:
            logger.warning(f"OllamaTriage falling back to RuleBasedTriage: {str(exc)}")
            return await self.fallback_provider.triage(title, description)
