from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_complaint_rejects_title_shorter_than_contract_minimum():
    response = client.post(
        "/api/complaints",
        json={
            "title": "Leak",
            "description": "Water is leaking from the public pipeline near our homes.",
            "location": "Sector G-10, Islamabad",
        },
    )

    assert response.status_code == 422
    errors = response.json()["detail"]
    title_error = next(error for error in errors if error["loc"] == ["body", "title"])
    assert title_error["type"] == "string_too_short"
    assert "at least 5 characters" in title_error["msg"]
