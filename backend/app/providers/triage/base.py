from abc import ABC, abstractmethod

from app.schemas.complaint import TriageResult


class BaseTriageProvider(ABC):
    """Abstract Base Class for Triage Providers"""

    @abstractmethod
    async def triage(self, title: str, description: str) -> TriageResult:
        """Triage a complaint given its title and description."""
        pass
