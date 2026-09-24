import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.providers.triage.factory import TriageFactory
from app.providers.triage.rules import RuleBasedTriage
from app.providers.triage.simulated import SimulatedTriage
from app.schemas.complaint import CategoryEnum, PriorityEnum

client = TestClient(app)


@pytest.mark.asyncio
async def test_rule_based_triage_water_category():
    provider = RuleBasedTriage()
    result = await provider.triage(
        title="Major Water Pipeline Leak",
        description="Clean drinking water is leaking from a main pipe on Street 5.",
    )
    assert result.category == CategoryEnum.WATER
    assert result.priority in [PriorityEnum.HIGH, PriorityEnum.CRITICAL, PriorityEnum.MEDIUM]
    assert result.triaged_by == "rule_based_v1"


@pytest.mark.asyncio
async def test_rule_based_triage_electricity_category():
    provider = RuleBasedTriage()
    result = await provider.triage(
        title="Transformer Sparking Hazard",
        description="Electric pole transformer is producing dangerous sparks and fire hazard.",
    )
    assert result.category == CategoryEnum.ELECTRICITY
    assert result.priority == PriorityEnum.CRITICAL
    assert result.triaged_by == "rule_based_v1"


@pytest.mark.asyncio
async def test_simulated_triage_deterministic():
    provider = SimulatedTriage()
    res1 = await provider.triage(title="Pothole in Sector F-7", description="Dangerous pothole")
    res2 = await provider.triage(title="Pothole in Sector F-7", description="Dangerous pothole")

    assert res1.category == res2.category
    assert res1.priority == res2.priority
    assert res1.triaged_by == "simulated_v1"


def test_triage_factory_resolution():
    p1 = TriageFactory.get_provider("rules")
    assert isinstance(p1, RuleBasedTriage)

    p2 = TriageFactory.get_provider("simulated")
    assert isinstance(p2, SimulatedTriage)


def test_complaint_creation_auto_triages():
    payload = {
        "title": "Severe Sewage Overflow on Main Avenue",
        "description": "Black water and filth is spilling out of broken sewer gutters near the market.",
        "location": "Main Avenue, Sector I-9",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "TRIAGED"
    assert data["category"] in ["SANITATION", "WATER", "WASTE", "ROADS", "ELECTRICITY", "OTHER"]
    assert data["priority"] is not None
    assert data["summary"] is not None
    assert data["triaged_by"] is not None
