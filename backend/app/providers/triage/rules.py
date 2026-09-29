import re

from app.providers.triage.base import BaseTriageProvider
from app.schemas.complaint import CategoryEnum, PriorityEnum, TriageResult


class RuleBasedTriage(BaseTriageProvider):
    """Keyword and pattern-matching rule engine for civic complaint triage."""

    _CATEGORY_KEYWORDS = {
        CategoryEnum.WATER: [
            "water",
            "leak",
            "leaking",
            "pipe",
            "pipeline",
            "drain",
            "sewage",
            "drinking water",
            "tap",
            "overflow",
        ],
        # Contract has no `waste` category — streetlight complaints get their own slot,
        # and the bucket is listed before ROADS so it wins keyword ties like "street light".
        CategoryEnum.STREETLIGHTS: [
            "streetlight",
            "street light",
            "street lamp",
            "lamp post",
            "lamppost",
            "traffic light",
        ],
        CategoryEnum.ROADS: [
            "road",
            "pothole",
            "asphalt",
            "street",
            "traffic",
            "highway",
            "footpath",
            "sidewalk",
            "bridge",
            "lane",
        ],
        CategoryEnum.ELECTRICITY: [
            "power",
            "electricity",
            "wire",
            "cable",
            "transformer",
            "outage",
            "blackout",
            "pole",
            "light",
            "spark",
        ],
        CategoryEnum.SANITATION: [
            "sanitation",
            "sewer",
            "gutters",
            "stink",
            "smell",
            "filth",
            "hygiene",
            "mosquito",
            "contamination",
        ],
    }

    # Contract priorities are high · normal · low (§2.3) — the old critical tier
    # folds into `high`, because the enum has no value above it.
    _HIGH_WORDS = [
        "danger",
        "hazard",
        "fire",
        "spark",
        "explosion",
        "emergency",
        "collapse",
        "severe",
        "life",
        "urgent",
        "blocking",
        "heavy",
        "overflowing",
        "major",
        "broken",
        "blackout",
        "main street",
    ]
    _NORMAL_WORDS = ["leaking", "pothole", "garbage", "smell", "delay", "issue"]

    def _determine_category(self, text: str) -> CategoryEnum:
        text_lower = text.lower()
        scores: dict[CategoryEnum, int] = {}

        for category, keywords in self._CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", text_lower))
            if score > 0:
                scores[category] = score

        if not scores:
            return CategoryEnum.OTHER

        return max(scores, key=lambda k: scores[k])

    def _determine_priority(self, text: str) -> PriorityEnum:
        text_lower = text.lower()

        if any(w in text_lower for w in self._HIGH_WORDS):
            return PriorityEnum.HIGH
        if any(w in text_lower for w in self._NORMAL_WORDS):
            return PriorityEnum.NORMAL

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
            triaged_by="rules",
            confidence_score=0.85,
        )
