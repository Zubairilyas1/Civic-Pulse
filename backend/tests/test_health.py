from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_readiness_check():
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "version": "0.1.0"}
