from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_valid_state_transitions_lifecycle():
    # 1. Create complaint (SUBMITTED)
    create_res = client.post(
        "/api/complaints",
        json={
            "title": "Pothole on Highway 5",
            "description": "Large pothole causing traffic slowdown near Exit 12.",
            "location": "Highway 5, Km 42",
        },
    )
    assert create_res.status_code == 201
    complaint_id = create_res.json()["id"]
    assert create_res.json()["status"] == "SUBMITTED"

    # 2. Advance to TRIAGED (Valid)
    triage_res = client.patch(
        f"/api/complaints/{complaint_id}/status", json={"status": "TRIAGED"}
    )
    assert triage_res.status_code == 200
    assert triage_res.json()["status"] == "TRIAGED"

    # 3. Advance to IN_PROGRESS (Valid)
    progress_res = client.patch(
        f"/api/complaints/{complaint_id}/status", json={"status": "IN_PROGRESS"}
    )
    assert progress_res.status_code == 200
    assert progress_res.json()["status"] == "IN_PROGRESS"

    # 4. Advance to RESOLVED (Valid)
    resolve_res = client.patch(
        f"/api/complaints/{complaint_id}/status", json={"status": "RESOLVED"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"


def test_invalid_state_transition_returns_409():
    # 1. Create complaint (SUBMITTED)
    create_res = client.post(
        "/api/complaints",
        json={
            "title": "Broken Street Light",
            "description": "Street light has been flickering and completely turned off.",
            "location": "Street 14, Block B",
        },
    )
    assert create_res.status_code == 201
    complaint_id = create_res.json()["id"]

    # 2. Attempt invalid direct transition SUBMITTED -> RESOLVED (Forbidden)
    invalid_res = client.patch(
        f"/api/complaints/{complaint_id}/status", json={"status": "RESOLVED"}
    )
    assert invalid_res.status_code == 409
    detail = invalid_res.json()["detail"]
    assert detail["error"] == "InvalidStatusTransition"
    assert detail["current_status"] == "SUBMITTED"
    assert detail["target_status"] == "RESOLVED"
