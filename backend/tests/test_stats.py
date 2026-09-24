from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_stats_endpoint():
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "by_status" in data
    assert "by_category" in data
    assert "by_priority" in data


def test_get_meta_providers_endpoint():
    response = client.get("/api/meta/providers")
    assert response.status_code == 200
    data = response.json()
    assert "active_provider" in data
    assert "available_providers" in data
    assert len(data["available_providers"]) == 4

    provider_names = [p["name"] for p in data["available_providers"]]
    assert "simulated" in provider_names
    assert "rules" in provider_names
    assert "groq" in provider_names
    assert "ollama" in provider_names


def test_x_request_id_header_injected():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0
