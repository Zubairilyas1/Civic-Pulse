import asyncio
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

    BUDGET_SECONDS = 10.0

    def __init__(self, fallback_provider: BaseTriageProvider | None = None):
        self.fallback_provider = fallback_provider or RuleBasedTriage()
        self.ollama_url = f"{settings.OLLAMA_HOST.rstrip('/')}/api/generate"

    async def _call_ollama(self, title: str, description: str) -> TriageResult:
        prompt = (
            f"You are a civic complaint classifier. Classify the following complaint.\n"
            f"Title: {title}\nDescription: {description}\n\n"
            f"Respond with JSON format containing keys 'category' (water, roads, electricity, streetlights, sanitation, other), "
            f"'priority' (high, normal, low), and 'summary'."
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

                # Values outside the contract enum raise ValueError and fall back to rules.
                category = CategoryEnum(str(content.get("category", "other")).lower())
                priority = PriorityEnum(str(content.get("priority", "normal")).lower())
                summary = content.get("summary", f"Ollama triaged in {latency_ms}ms.")

                return TriageResult(
                    category=category,
                    priority=priority,
                    summary=summary,
                    triaged_by="llm:ollama",
                    confidence_score=0.90,
                )

            raise RuntimeError(f"Ollama returned HTTP status {response.status_code}")

    async def triage(self, title: str, description: str) -> TriageResult:
        try:
            # Same wall-clock budget as the Groq provider (locked retry decision).
            async with asyncio.timeout(self.BUDGET_SECONDS):
                return await self._call_ollama(title, description)
        except Exception as exc:
            # The contract's single WARNING is emitted by ComplaintService after persist.
            logger.info(f"OllamaTriage falling back to rules: {type(exc).__name__}: {exc}")
            fallback_result = await self.fallback_provider.triage(title, description)
            # Contract §2.3: LLM failures surface as triaged_by = rules:fallback.
            return fallback_result.model_copy(
                update={
                    "triaged_by": "rules:fallback",
                    "fallback_reason": f"{type(exc).__name__}: {exc}",
                }
            )
