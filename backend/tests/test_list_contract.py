"""List endpoint contract: {items, total, page, page_size} envelope and validation."""


def _create(client, title: str) -> dict:
    response = client.post(
        "/api/complaints",
        json={
            "title": title,
            "description": "Automated fixture complaint created to exercise the list contract.",
            "location": "Sector G-10, Islamabad",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_list_returns_envelope_and_paginates(client):
    for index in range(3):
        _create(client, f"Pagination fixture complaint number {index}")

    first = client.get("/api/complaints?page=1&page_size=2")
    assert first.status_code == 200
    body = first.json()
    assert set(body) == {"items", "total", "page", "page_size"}
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert body["total"] == 3
    assert len(body["items"]) == 2

    second = client.get("/api/complaints?page=2&page_size=2")
    assert second.status_code == 200
    page_two = second.json()
    assert page_two["total"] == 3
    assert len(page_two["items"]) == 1

    first_ids = {item["id"] for item in body["items"]}
    second_ids = {item["id"] for item in page_two["items"]}
    assert first_ids.isdisjoint(second_ids)


def test_list_filters_by_status_with_total(client):
    keep = _create(client, "Complaint that stays in the queue untouched")
    advance = _create(client, "Complaint that will be resolved by this test")

    moved = client.patch(
        f"/api/complaints/{advance['id']}/status",
        json={"status": "in_progress"},
    )
    assert moved.status_code == 200
    resolved = client.patch(
        f"/api/complaints/{advance['id']}/status",
        json={"status": "resolved"},
    )
    assert resolved.status_code == 200

    response = client.get("/api/complaints?status=resolved")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert [item["id"] for item in body["items"]] == [advance["id"]]

    open_list = client.get("/api/complaints?status=open")
    assert open_list.json()["total"] == 1
    assert open_list.json()["items"][0]["id"] == keep["id"]


def test_list_rejects_page_size_above_contract_limit(client):
    response = client.get("/api/complaints?page_size=500")
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["error"] == "ValidationError"
    assert "page_size" in detail["fields"]


def test_list_rejects_page_below_one(client):
    response = client.get("/api/complaints?page=0")
    assert response.status_code == 400
    assert "page" in response.json()["detail"]["fields"]


def test_list_rejects_unknown_category_value(client):
    response = client.get("/api/complaints?category=TELEPORTATION")
    assert response.status_code == 400
    assert "category" in response.json()["detail"]["fields"]
