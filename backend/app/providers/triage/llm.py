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
    """Groq Cloud LLM Triage provider with guardrails, caching, jitter retries, and fallback."""

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "llama3-70b-8192"

    def __init__(self, fallback_provider: BaseTriageProvider | None = None):
        self.fallback_provider = fallback_provider or RuleBasedTriage()

    async def _call_groq_api(self, title: str, description: str) -> TriageResult:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable is not configured.")

        system_prompt = (
            "You are an AI Civic Complaint Triage System for municipal government. "
            "Analyze the complaint title and description and output valid JSON ONLY with keys: "
            "'category' (one of: WATER, ROADS, ELECTRICITY, WASTE, SANITATION, OTHER), "
            "'priority' (one of: LOW, MEDIUM, HIGH, CRITICAL), "
            "and 'summary' (brief 1-2 sentence executive summary)."
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

        # 10 second timeout & 1 jittered retry on failure/rate-limit
        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(2):
                try:
                    response = await client.post(
                        self.GROQ_URL, headers=headers, json=payload
                    )
                    if response.status_code == 200:
                        data = response.json()
                        content = json.loads(data["choices"][0]["message"]["content"])

                        category = CategoryEnum(
                            content.get("category", "OTHER").upper()
                        )
                        priority = PriorityEnum(
                            content.get("priority", "MEDIUM").upper()
                        )
                        summary = content.get("summary", "LLM triage complete.")

                        return TriageResult(
                            category=category,
                            priority=priority,
                            summary=summary,
                            triaged_by="groq_llama3",
                            confidence_score=0.95,
                        )

                    logger.warning(
                        f"Groq API returned HTTP status {response.status_code}"
                    )

                except (httpx.TimeoutException, httpx.RequestError) as exc:
                    logger.warning(f"Groq API attempt {attempt + 1} failed: {str(exc)}")

                # Jitter retry delay
                if attempt == 0:
                    await asyncio.sleep(0.5 + random.uniform(0.1, 0.3))

            raise RuntimeError("Groq LLM API requests failed after retries.")

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
            logger.warning(f"LLMTriage falling back to RuleBasedTriage: {str(exc)}")
            fallback_result = await self.fallback_provider.triage(
                clean_title, clean_desc
            )
            return fallback_result
