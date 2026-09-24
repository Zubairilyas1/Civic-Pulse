from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_and_get_complaint():
    payload = {
        "title": "Broken Water Pipeline in Sector G-10",
        "description": "Clean drinking water is leaking profusely on Main Street near House 42.",
        "location": "Sector G-10/4, Islamabad",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "TRIAGED"
    assert "id" in data

    complaint_id = data["id"]
    get_res = client.get(f"/api/complaints/{complaint_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == complaint_id


def test_complaint_not_found():
    response = client.get("/api/complaints/non-existent-id")
    assert response.status_code == 404
