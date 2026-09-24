import re
from typing import Tuple
from app.providers.triage.base import BaseTriageProvider
from app.schemas.complaint import CategoryEnum, PriorityEnum, TriageResult


class RuleBasedTriage(BaseTriageProvider):
    """Keyword and pattern-matching rule engine for civic complaint triage."""

    # Keyword mapping dictionary for categories
    _CATEGORY_KEYWORDS = {
        CategoryEnum.WATER: [
            "water", "leak", "leaking", "pipe", "pipeline", "drain", "sewage", "drinking water", "tap", "overflow"
        ],
        CategoryEnum.ROADS: [
            "road", "pothole", "asphalt", "street", "traffic", "highway", "footpath", "sidewalk", "bridge", "lane"
        ],
        CategoryEnum.ELECTRICITY: [
            "power", "electricity", "wire", "cable", "transformer", "outage", "blackout", "pole", "light", "spark"
        ],
        CategoryEnum.WASTE: [
            "garbage", "trash", "waste", "dump", "bin", "litter", "rubbish", "cleaning", "heap"
        ],
        CategoryEnum.SANITATION: [
            "sanitation", "sewer", "gutters", "stink", "smell", "filth", "hygiene", "mosquito", "contamination"
        ],
    }

    # Priority trigger words
    _CRITICAL_WORDS = ["danger", "hazard", "fire", "spark", "explosion", "emergency", "collapse", "severe", "life"]
    _HIGH_WORDS = ["urgent", "blocking", "heavy", "overflowing", "major", "broken", "blackout", "main street"]
    _MEDIUM_WORDS = ["leaking", "pothole", "garbage", "smell", "delay", "issue"]

    def _determine_category(self, text: str) -> CategoryEnum:
        text_lower = text.lower()
        scores = {}

        for category, keywords in self._CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
            if score > 0:
                scores[category] = score

        if not scores:
            return CategoryEnum.OTHER

        # Return category with highest keyword match count
        return max(scores, key=scores.get)

    def _determine_priority(self, text: str) -> PriorityEnum:
        text_lower = text.lower()

        if any(w in text_lower for w in self._CRITICAL_WORDS):
            return PriorityEnum.CRITICAL
        if any(w in text_lower for w in self._HIGH_WORDS):
            return PriorityEnum.HIGH
        if any(w in text_lower for w in self._MEDIUM_WORDS):
            return PriorityEnum.MEDIUM

        return PriorityEnum.LOW

    async def triage(self, title: str, description: str) -> TriageResult:
        combined_text = f"{title} {description}"
        category = self._determine_category(combined_text)
        priority = self._determine_priority(combined_text)

        summary = f"Rule-based classification identified category '{category.value}' with priority '{priority.value}' based on keyword heuristics."

        return TriageResult(
            category=category,
            priority=priority,
            summary=summary,
            triaged_by="rule_based_v1",
            confidence_score=0.85,
        )
