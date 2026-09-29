def test_valid_state_transitions_lifecycle(client):
    # 1. Create complaint (auto-triaged, but the contract keeps status at `open`)
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
    assert create_res.json()["status"] == "open"

    # 2. open -> in_progress (valid)
    progress_res = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"})
    assert progress_res.status_code == 200
    assert progress_res.json()["status"] == "in_progress"

    # 3. in_progress -> resolved (valid)
    resolve_res = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "resolved"})
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"


def test_invalid_state_transition_returns_409(client):
    # 1. Create complaint
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
    assert create_res.json()["status"] == "open"

    # 2. Advance to resolved then attempt invalid transition back to in_progress
    #    (forbidden from a terminal state)
    client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"})
    client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "resolved"})

    invalid_res = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"})
    assert invalid_res.status_code == 409
    detail = invalid_res.json()["detail"]
    assert detail["error"] == "InvalidStatusTransition"
    assert detail["current_status"] == "resolved"
    assert detail["target_status"] == "in_progress"


def test_same_status_patch_is_409_not_silent_noop(client):
    # The contract's transition table has no same-to-same edge: everything else is 409.
    create_res = client.post(
        "/api/complaints",
        json={
            "title": "Clogged Drain on Corner Lane",
            "description": "Storm drain is clogged and water is pooling on the pavement.",
            "location": "Corner Lane, Block C",
        },
    )
    assert create_res.status_code == 201
    complaint_id = create_res.json()["id"]

    noop_res = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "open"})
    assert noop_res.status_code == 409
    detail = noop_res.json()["detail"]
    assert detail["current_status"] == "open"
    assert detail["target_status"] == "open"


def test_open_can_be_rejected(client):
    create_res = client.post(
        "/api/complaints",
        json={
            "title": "Duplicate Sidewalk Crack Report",
            "description": "This crack was already reported last week by a neighbour.",
            "location": "Sector G-10, Islamabad",
        },
    )
    assert create_res.status_code == 201
    complaint_id = create_res.json()["id"]

    reject_res = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "rejected"})
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"

    # rejected is terminal
    after_terminal = client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"})
    assert after_terminal.status_code == 409
