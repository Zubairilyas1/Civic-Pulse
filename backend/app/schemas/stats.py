from datetime import datetime

from pydantic import BaseModel, Field


class StatsResponse(BaseModel):
    total_complaints: int = Field(..., description="Total number of complaints in system")
    by_status: dict[str, int] = Field(..., description="Breakdown count by status")
    by_category: dict[str, int] = Field(..., description="Breakdown count by category")
    by_priority: dict[str, int] = Field(..., description="Breakdown count by priority")


class ProviderInfo(BaseModel):
    name: str = Field(..., description="Identifier name of the provider")
    enabled: bool = Field(..., description="Whether provider is configured and available")
    description: str = Field(..., description="Human readable description")


class TriageOutcome(BaseModel):
    """One triage attempt, as required by the /api/meta/providers observability surface."""

    complaint_id: str = Field(..., description="UUID of the complaint that was triaged")
    provider: str = Field(..., description="Active provider for the attempt (groq, ollama, rules, simulated)")
    latency_ms: int = Field(..., ge=0, description="Wall-clock triage latency in milliseconds")
    fallback: bool = Field(..., description="True when the attempt degraded to rules or failed")
    error_class: str | None = Field(None, description="Error class when the attempt fell back")
    timestamp: datetime = Field(..., description="When the triage attempt completed (UTC)")


class ProvidersMetaResponse(BaseModel):
    active_provider: str = Field(..., description="Currently active triage provider")
    available_providers: list[ProviderInfo] = Field(..., description="List of supported providers")
    recent_outcomes: list[TriageOutcome] = Field(
        default_factory=list,
        description="Last 20 triage outcomes (provider, latency ms, fallback y/n), newest first",
    )
