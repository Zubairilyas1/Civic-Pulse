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

        combined = f"{title} {description}".lower()
        municipal_keywords = ["water", "leak", "road", "pothole", "power", "wire", "garbage", "trash", "sanitation", "sewer", "drain", "pipe", "light", "outage"]

        # Default non-infrastructure or generic text to OTHER and LOW
        if not any(kw in combined for kw in municipal_keywords):
            category = CategoryEnum.OTHER
            priority = PriorityEnum.LOW
            summary = "Simulated triage categorized generic report as 'OTHER' with 'LOW' priority."
        else:
            # Hash combined text to generate deterministic index for keyword-matching infrastructure complaints
            text_hash = int(hashlib.md5(f"{title}{description}".encode()).hexdigest(), 16)
            category = self._CATEGORIES[text_hash % len(self._CATEGORIES)]
            priority = self._PRIORITIES[(text_hash >> 2) % len(self._PRIORITIES)]
            summary = f"Simulated triage assigned category '{category.value}' and priority '{priority.value}' based on hash seed."

        return TriageResult(
            category=category,
            priority=priority,
            summary=summary,
            triaged_by="simulated",
            confidence_score=0.99,
        )
