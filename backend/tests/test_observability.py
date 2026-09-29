"""Observability surface: /metrics exposition and /api/meta/providers outcomes."""

from app.services.triage_log import MAX_OUTCOMES, TriageLog


def _create_complaint(client, title="Observability probe complaint") -> dict:
    response = client.post(
        "/api/complaints",
        json={
            "title": title,
            "description": "An observability probe for metrics and meta outcomes.",
            "location": "Sector G-10, Islamabad",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_metrics_endpoint_exposes_contract_metrics(client):
    # Generate some traffic so the collectors have samples.
    client.get("/api/complaints?page=1&page_size=5")

    response = client.get("/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")

    body = response.text
    assert "# HELP" in body and "# TYPE" in body
    assert "http_requests_total" in body
    assert "http_request_duration_seconds" in body
    assert "triage_duration_seconds" in body
    assert "triage_fallbacks_total" in body
    # Route labels are templates (path params collapsed), so cardinality stays
    # bounded; the /api mount prefix is not part of the route template.
    assert 'http_requests_total{method="GET",route="/complaints",status="200"}' in body


def test_meta_providers_reports_recent_triage_outcomes(client):
    created = _create_complaint(client)

    response = client.get("/api/meta/providers")
    assert response.status_code == 200
    data = response.json()

    assert data["active_provider"] == "simulated"  # set by conftest for CI safety
    assert len(data["available_providers"]) == 4

    outcomes = data["recent_outcomes"]
    assert len(outcomes) >= 1
    latest = outcomes[0]
    assert latest["complaint_id"] == created["id"]
    assert latest["provider"] == "simulated"
    assert isinstance(latest["latency_ms"], int)
    assert latest["latency_ms"] >= 0
    assert latest["fallback"] is False


def test_failed_triage_records_fallback_outcome(client, monkeypatch):
    from app.providers.triage.factory import TriageFactory

    def exploding_provider(*args, **kwargs):
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(TriageFactory, "get_provider", exploding_provider)

    created = _create_complaint(client, title="Fallback outcome probe complaint")

    outcome = client.get("/api/meta/providers").json()["recent_outcomes"][0]
    assert outcome["complaint_id"] == created["id"]
    assert outcome["fallback"] is True
    assert outcome["error_class"] == "RuntimeError"

    # The complaint still persisted with triage fields null (degraded, not failed).
    assert created["status"] == "open"
    assert created["triaged_by"] is None

    # Fallback counter has a non-zero sample in the exposition.
    body = client.get("/metrics").text
    samples = [
        float(line.rsplit(" ", 1)[1])
        for line in body.splitlines()
        if line.startswith("triage_fallbacks_total{")
    ]
    assert samples and max(samples) >= 1.0


def test_triage_log_keeps_only_last_20_outcomes():
    TriageLog.clear()
    try:
        for i in range(MAX_OUTCOMES + 5):
            TriageLog.record(
                complaint_id=f"id-{i}",
                provider="simulated",
                latency_ms=i,
                fallback=False,
            )
        recent = TriageLog.recent()
        assert len(recent) == MAX_OUTCOMES
        # Newest first
        assert recent[0].complaint_id == f"id-{MAX_OUTCOMES + 4}"
        assert recent[-1].complaint_id == "id-5"
    finally:
        TriageLog.clear()
