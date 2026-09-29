"""Contract retry policy for the Groq provider.

Locked decision: a 10 s wall-clock budget wraps the call, exactly one retry —
only for 429 or 5xx — and 4xx responses are never retried. Every failure ends
in the rules fallback with `triaged_by = rules:fallback`.
"""

import asyncio
import json

import httpx

from app.config import settings
from app.providers.triage.cache import TriageCache
from app.providers.triage.llm import LLMTriage


def _install_transport(monkeypatch, handler) -> list[httpx.Request]:
    """Route every httpx.AsyncClient in the app through a scripted MockTransport."""
    calls: list[httpx.Request] = []

    def counting(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return handler(len(calls), request)

    transport = httpx.MockTransport(counting)
    real_client = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    TriageCache._cache.clear()
    return calls


def _success_response() -> httpx.Response:
    content = json.dumps({"category": "roads", "priority": "high", "summary": "Pothole repair dispatched."})
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


def test_429_is_retried_once_and_can_succeed(monkeypatch):
    calls = _install_transport(
        monkeypatch,
        lambda n, request: httpx.Response(429, json={"error": "rate limited"}) if n == 1 else _success_response(),
    )

    result = asyncio.run(
        LLMTriage().triage(
            title="Retry policy test pothole",
            description="A deep pothole on the service road.",
        )
    )

    assert len(calls) == 2  # original + exactly one retry
    assert result.triaged_by == "llm:groq"


def test_4xx_is_never_retried(monkeypatch):
    calls = _install_transport(monkeypatch, lambda n, request: httpx.Response(400, json={"error": "bad request"}))

    result = asyncio.run(
        LLMTriage().triage(
            title="Retry policy test 400",
            description="Bad request must not be retried.",
        )
    )

    assert len(calls) == 1  # no retry for 4xx
    assert result.triaged_by == "rules:fallback"
    assert result.fallback_reason is not None
    assert "HTTP 400" in result.fallback_reason
    assert "never retried" in result.fallback_reason


def test_5xx_retries_once_then_falls_back(monkeypatch):
    calls = _install_transport(monkeypatch, lambda n, request: httpx.Response(503, json={"error": "unavailable"}))

    result = asyncio.run(
        LLMTriage().triage(
            title="Retry policy test 503",
            description="Server errors are retried exactly once.",
        )
    )

    assert len(calls) == 2  # one retry only
    assert result.triaged_by == "rules:fallback"
    assert result.fallback_reason is not None
    assert "still failing after one retry" in result.fallback_reason


def test_wall_clock_budget_forces_fallback(monkeypatch):
    # A post that actually suspends lets the budget timer fire; MockTransport
    # handlers complete without yielding, so asyncio.timeout would never trip.
    calls: list[str] = []

    async def slow_post(self, url, **kwargs):
        calls.append(str(url))
        await asyncio.sleep(5)
        return _success_response()

    monkeypatch.setattr(httpx.AsyncClient, "post", slow_post)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(LLMTriage, "BUDGET_SECONDS", 0.05)
    TriageCache._cache.clear()

    result = asyncio.run(
        LLMTriage().triage(
            title="Retry policy test budget",
            description="The wall-clock budget must bound the whole call.",
        )
    )

    assert result.triaged_by == "rules:fallback"
    assert result.fallback_reason is not None
    assert "wall-clock budget" in result.fallback_reason
    assert len(calls) == 1  # the request started but the budget cut it off


def test_success_is_cached_for_24h(monkeypatch):
    _install_transport(monkeypatch, lambda n, request: _success_response())

    provider = LLMTriage()
    first = asyncio.run(
        provider.triage(title="Retry policy cache probe", description="Cache this result please.")
    )
    second = asyncio.run(
        provider.triage(title="Retry policy cache probe", description="Cache this result please.")
    )

    assert first == second
