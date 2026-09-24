from typing import Dict, List
from pydantic import BaseModel, Field


class StatsResponse(BaseModel):
    total_complaints: int = Field(..., description="Total number of complaints in system")
    by_status: Dict[str, int] = Field(..., description="Breakdown count by status")
    by_category: Dict[str, int] = Field(..., description="Breakdown count by category")
    by_priority: Dict[str, int] = Field(..., description="Breakdown count by priority")


class ProviderInfo(BaseModel):
    name: str = Field(..., description="Identifier name of the provider")
    enabled: bool = Field(..., description="Whether provider is configured and available")
    description: str = Field(..., description="Human readable description")


class ProvidersMetaResponse(BaseModel):
    active_provider: str = Field(..., description="Currently active triage provider")
    available_providers: List[ProviderInfo] = Field(..., description="List of supported providers")
