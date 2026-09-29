def test_create_complaint_rejects_title_shorter_than_contract_minimum(client):
    response = client.post(
        "/api/complaints",
        json={
            "title": "Leak",
            "description": "Water is leaking from the public pipeline near our homes.",
            "location": "Sector G-10, Islamabad",
        },
    )

    # The contract mandates 400 with a field-level body (not FastAPI's default 422).
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["error"] == "ValidationError"
    assert detail["message"] == "Request validation failed"
    title_errors = detail["fields"]["title"]
    assert any("at least 5 characters" in message for message in title_errors)
