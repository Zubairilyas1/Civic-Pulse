import hashlib
from app.providers.triage.base import BaseTriageProvider
from app.schemas.complaint import CategoryEnum, PriorityEnum, TriageResult


class SimulatedTriage(BaseTriageProvider):
    """Deterministic simulated triage provider for repeatable offline testing and CI pipelines."""

    _CATEGORIES = list(CategoryEnum)
    _PRIORITIES = list(PriorityEnum)

    def __init__(self, force_failure: bool = False):
        self.force_failure = force_failure

    async def triage(self, title: str, description: str) -> TriageResult:
        if self.force_failure:
            raise RuntimeError("SimulatedTriage configured failure triggered.")

        # Hash combined text to generate deterministic index
        text_hash = int(hashlib.md5(f"{title}{description}".encode("utf-8")).hexdigest(), 16)

        category = self._CATEGORIES[text_hash % len(self._CATEGORIES)]
        priority = self._PRIORITIES[(text_hash >> 2) % len(self._PRIORITIES)]

        summary = f"Simulated triage assigned category '{category.value}' and priority '{priority.value}' based on hash seed."

        return TriageResult(
            category=category,
            priority=priority,
            summary=summary,
            triaged_by="simulated_v1",
            confidence_score=0.99,
        )
