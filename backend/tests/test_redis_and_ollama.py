import asyncio
from fastapi.testclient import TestClient

from app.main import app
from app.providers.triage.factory import TriageFactory
from app.providers.triage.ollama import OllamaTriage
from app.schemas.complaint import CategoryEnum

client = TestClient(app)


def test_ollama_triage_fallback_when_unreachable():
    provider = OllamaTriage()
    result = asyncio.run(
        provider.triage(
            title="Sewer Pipe Overflowing",
            description="Dirty sewage water overflowing on street.",
        )
    )

    assert result is not None
    assert result.category == CategoryEnum.SANITATION
    assert "rule_based" in result.triaged_by  # Fallback verified!


def test_triage_factory_ollama_resolution():
    provider = TriageFactory.get_provider("ollama")
    assert isinstance(provider, OllamaTriage)


def test_stats_x_cache_header_and_invalidation():
    # 1. First call to /api/stats -> Cache MISS
    res1 = client.get("/api/stats")
    assert res1.status_code == 200
    assert res1.headers.get("X-Cache") == "MISS"

    # 2. Second call to /api/stats -> Cache HIT
    res2 = client.get("/api/stats")
    assert res2.status_code == 200
    assert res2.headers.get("X-Cache") == "HIT"

    # 3. Create new complaint -> Invalidates stats cache
    client.post(
        "/api/complaints",
        json={
            "title": "Broken Street Lamp",
            "description": "Street lamp pole fell down.",
            "location": "Sector G-9",
        },
    )

    # 4. Third call to /api/stats -> Cache MISS again (Invalidated!)
    res3 = client.get("/api/stats")
    assert res3.status_code == 200
    assert res3.headers.get("X-Cache") == "MISS"


def test_rate_limiter_exceeded_returns_429():
    # Rapid requests to test rate limiter threshold
    from app.middleware.rate_limiter import RateLimiterMiddleware

    # Artificially trigger limit for test IP
    RateLimiterMiddleware._requests["127.0.0.1"] = [1.0] * 65

    response = client.get("/api/stats")
    assert response.status_code == 429
    assert "Retry-After" in response.headers
    assert response.json()["error"] == "Too Many Requests"

    # Reset test limit state
    RateLimiterMiddleware._requests.clear()
