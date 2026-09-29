"""Ring buffer of recent triage outcomes for GET /api/meta/providers.

Contract §2.2: the meta endpoint exposes "the last 20 triage outcomes
(provider, latency ms, fallback y/n)" as the team's observability surface.
Process-local on purpose: outcomes are diagnostics, not audit records — the
durable trail is the complaint row itself (triaged_by, triage_latency_ms).
"""

from collections import deque
from datetime import UTC, datetime

from app.schemas.stats import TriageOutcome

MAX_OUTCOMES = 20


class TriageLog:
    _entries: deque[TriageOutcome] = deque(maxlen=MAX_OUTCOMES)

    @classmethod
    def record(
        cls,
        *,
        complaint_id: str,
        provider: str,
        latency_ms: int,
        fallback: bool,
        error_class: str | None = None,
    ) -> None:
        cls._entries.append(
            TriageOutcome(
                complaint_id=complaint_id,
                provider=provider,
                latency_ms=latency_ms,
                fallback=fallback,
                error_class=error_class,
                timestamp=datetime.now(UTC),
            )
        )

    @classmethod
    def recent(cls) -> list[TriageOutcome]:
        """Newest first, at most 20 entries."""
        return list(reversed(cls._entries))

    @classmethod
    def clear(cls) -> None:
        cls._entries.clear()
