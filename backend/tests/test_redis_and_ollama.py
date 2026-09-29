import asyncio
import os
import time

import redis as sync_redis

from app.providers.triage.factory import TriageFactory
from app.providers.triage.ollama import OllamaTriage


def _seed_rate_limit(ip: str, count: int = 61) -> None:
    """Pre-fill this minute's Redis window for an IP so the next request trips §2.4.

    The counter is shared by every backend replica, so the test seeds it exactly
    where production reads it: a `ratelimit:<ip>:<window>` key in Redis DB 15.
    """
    window = int(time.time() // 60)
    client = sync_redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=0.5)
    try:
        client.set(f"ratelimit:{ip}:{window}", count, ex=120)
    finally:
        client.close()


def test_ollama_triage_fallback_when_unreachable():
    provider = OllamaTriage()
    result = asyncio.run(
        provider.triage(
            title="Sewer Gutters Filth Overflowing",
            description="Dirty sewage gutters overflowing on street.",
        )
    )

    assert result is not None
    assert result.category is not None
    assert result.triaged_by == "rules:fallback"  # Contract §2.3 fallback marker.


def test_triage_factory_ollama_resolution():
    provider = TriageFactory.get_provider("ollama")
    assert isinstance(provider, OllamaTriage)


def test_stats_x_cache_header_and_invalidation(client):
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
            "title": "Broken Street Lamp Pole",
            "description": "Street lamp pole fell down on sidewalk.",
            "location": "Sector G-9",
        },
    )

    # 4. Third call to /api/stats -> Cache MISS again (Invalidated!)
    res3 = client.get("/api/stats")
    assert res3.status_code == 200
    assert res3.headers.get("X-Cache") == "MISS"


def test_rate_limiter_exceeded_returns_429(client):
    # The TestClient reports either IP depending on the transport; seed both so the
    # assertion is deterministic. Counter lives in Redis (shared across replicas).
    _seed_rate_limit("testclient")
    _seed_rate_limit("127.0.0.1")

    response = client.get("/api/stats")
    assert response.status_code == 429
    assert "Retry-After" in response.headers
    assert response.json()["error"] == "Too Many Requests"


def test_rate_limit_counter_lives_in_redis(client):
    """Prove the budget is distributed: the window key must exist in Redis, not process memory."""
    response = client.get("/api/stats")
    assert response.status_code == 200

    window = int(time.time() // 60)
    redis_client = sync_redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=0.5)
    try:
        counters = {}
        for key in redis_client.scan_iter(f"ratelimit:*:{window}"):
            value = redis_client.get(key)
            if value is not None:
                counters[key.decode()] = int(value)
    finally:
        redis_client.close()

    assert counters, "no ratelimit window key in Redis — limiter counter is not distributed"
    assert all(count >= 1 for count in counters.values())


def test_health_probes_are_exempt_from_rate_limit(client):
    """Kubernetes probes must never be throttled — a 429 probe looks like an outage."""
    _seed_rate_limit("testclient", 1000)
    _seed_rate_limit("127.0.0.1", 1000)
    # Regular endpoints are limited...
    assert client.get("/api/stats").status_code == 429
    # ...but every health/readiness path (root and /api copies) still answers.
    assert client.get("/health").status_code == 200
    assert client.get("/ready").status_code == 200
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/ready").status_code == 200
