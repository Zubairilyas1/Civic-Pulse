import asyncio
import json
import logging
import random

import httpx

from app.config import settings
from app.providers.triage.base import BaseTriageProvider
from app.providers.triage.cache import TriageCache
from app.providers.triage.guardrails import PromptGuardrail
from app.providers.triage.rules import RuleBasedTriage
from app.schemas.complaint import CategoryEnum, PriorityEnum, TriageResult

logger = logging.getLogger("civicpulse.llm_triage")


class LLMTriage(BaseTriageProvider):
    """Groq Cloud LLM Triage provider with guardrails, caching, and contract retry policy.

    Retry contract (locked decision): a 10 s wall-clock budget wraps the whole call,
    exactly one retry — and only for 429 or 5xx — and 4xx responses are never
    retried. Every failure path falls through to RuleBasedTriage with
    `triaged_by = rules:fallback` and one WARNING log line.
    """

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "llama-3.3-70b-versatile"
    BUDGET_SECONDS = 10.0
    RETRY_DELAY_RANGE = (0.5, 0.8)

    def __init__(self, fallback_provider: BaseTriageProvider | None = None):
        self.fallback_provider = fallback_provider or RuleBasedTriage()

    async def _call_groq_api(self, title: str, description: str) -> TriageResult:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is not configured.")

        system_prompt = (
            "You are an AI Civic Complaint Triage System for municipal government. "
            "Analyze the complaint title and description and output valid JSON ONLY with keys: "
            "'category' (one of: water, roads, electricity, streetlights, sanitation, other), "
            "'priority' (one of: high, normal, low), "
            "and 'summary' (brief 1-2 sentence executive summary, max 140 chars, single line). "
            "If the complaint text is generic, personal, or does not describe a municipal infrastructure issue, "
            "classify category as other and priority as low."
        )
        user_content = f"Title: {title}\nDescription: {description}"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 300,
        }

        # Wall-clock budget: the retry policy must never stall complaint intake.
        try:
            async with asyncio.timeout(self.BUDGET_SECONDS):
                return await self._post_with_contract_retry(payload, headers)
        except TimeoutError:
            raise RuntimeError(f"Groq triage exceeded the {self.BUDGET_SECONDS:.0f}s wall-clock budget.")

    async def _post_with_contract_retry(
        self,
        payload: dict[str, object],
        headers: dict[str, str],
    ) -> TriageResult:
        async with httpx.AsyncClient(timeout=8.0) as client:
            for attempt in range(2):
                try:
                    response = await client.post(self.GROQ_URL, headers=headers, json=payload)
                except (httpx.TimeoutException, httpx.RequestError) as exc:
                    # Transport failures are not retried: the wall-clock budget would
                    # be spent waiting instead of triaging, and rules fallback is cheap.
                    raise RuntimeError(f"Groq request failed: {exc}") from exc

                if response.status_code == 200:
                    data = response.json()
                    content = json.loads(data["choices"][0]["message"]["content"])

                    # Any value outside the contract enum raises ValueError and
                    # falls through to RuleBasedTriage — model output is never trusted.
                    category = CategoryEnum(str(content.get("category", "other")).lower())
                    priority = PriorityEnum(str(content.get("priority", "low")).lower())
                    summary = content.get("summary", "LLM triage complete.")

                    return TriageResult(
                        category=category,
                        priority=priority,
                        summary=summary,
                        triaged_by="llm:groq",
                        confidence_score=0.95,
                    )

                if response.status_code == 429 or response.status_code >= 500:
                    if attempt == 0:
                        low, high = self.RETRY_DELAY_RANGE
                        logger.warning(
                            f"Groq API returned HTTP {response.status_code}; retrying once after a jitter delay."
                        )
                        await asyncio.sleep(low + random.uniform(0.0, high - low))
                        continue
                    raise RuntimeError(
                        f"Groq API still failing after one retry: HTTP {response.status_code}."
                    )

                # Contract: 4xx is never retried.
                raise RuntimeError(
                    f"Groq API returned HTTP {response.status_code}; 4xx responses are never retried."
                )

        raise RuntimeError("Groq triage ended without a response.")

    async def triage(self, title: str, description: str) -> TriageResult:
        # Step 1: Prompt Guardrail Sanitization
        clean_title, title_injected = PromptGuardrail.sanitize(title)
        clean_desc, desc_injected = PromptGuardrail.sanitize(description)

        if title_injected or desc_injected:
            logger.warning("Prompt injection attempt detected and sanitized.")

        # Step 2: Content-Hash Cache Check
        cached = TriageCache.get(clean_title, clean_desc)
        if cached:
            logger.info("Triage result served from content-hash cache (Cache HIT).")
            return cached

        # Step 3: LLM API Call with Fallback
        try:
            result = await self._call_groq_api(clean_title, clean_desc)
            # Store in cache
            TriageCache.set(clean_title, clean_desc, result)
            return result
        except Exception as exc:
            # The contract's single WARNING (complaint id, provider, error class)
            # is emitted by ComplaintService after persist, where the id exists.
            logger.info(f"LLMTriage falling back to rules: {type(exc).__name__}: {exc}")
            fallback_result = await self.fallback_provider.triage(clean_title, clean_desc)
            # Contract §2.3: LLM failures surface as triaged_by = rules:fallback.
            return fallback_result.model_copy(
                update={
                    "triaged_by": "rules:fallback",
                    "fallback_reason": f"{type(exc).__name__}: {exc}",
                }
            )
