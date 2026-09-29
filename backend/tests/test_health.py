def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_health_check_at_root_without_api_prefix(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_readiness_check(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["version"] == "0.1.0"
    assert body["dependencies"] == {"postgres": "ok", "redis": "ok"}
    assert body["failed_dependency"] is None


def test_readiness_check_at_root_without_api_prefix(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_readiness_returns_503_naming_redis_when_cache_is_down(client, monkeypatch):
    from app.db.redis import RedisService

    async def _redis_down(cls) -> bool:
        return False

    monkeypatch.setattr(RedisService, "check", classmethod(_redis_down))

    response = client.get("/api/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unready"
    assert body["failed_dependency"] == "redis"
    assert body["dependencies"]["redis"] != "ok"
    assert body["dependencies"]["postgres"] == "ok"


def test_readiness_returns_503_naming_postgres_when_database_is_down(client, monkeypatch):
    import app.routes.health as health_module

    async def _postgres_down(session) -> str:
        return "unreachable (SimulatedOutage)"

    monkeypatch.setattr(health_module, "_probe_postgres", _postgres_down)

    response = client.get("/api/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["failed_dependency"] == "postgres"
    assert "unreachable" in body["dependencies"]["postgres"]
    assert body["dependencies"]["redis"] == "ok"
