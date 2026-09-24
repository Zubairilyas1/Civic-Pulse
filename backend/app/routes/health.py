from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthStatus(BaseModel):
    status: str
    version: str


@router.get("/health", response_model=HealthStatus)
async def get_health():
    """Liveness probe endpoint."""
    return HealthStatus(status="ok", version="0.1.0")


@router.get("/ready", response_model=HealthStatus)
async def get_readiness():
    """Readiness probe endpoint."""
    return HealthStatus(status="ready", version="0.1.0")
