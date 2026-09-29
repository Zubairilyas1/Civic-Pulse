from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import RedisService
from app.db.session import get_db_session

router = APIRouter(tags=["Health"])


class HealthStatus(BaseModel):
    status: str
    version: str


class ReadinessStatus(BaseModel):
    status: str
    version: str
    dependencies: dict[str, str]
    failed_dependency: str | None = None


VERSION = "0.1.0"


@router.get("/health", response_model=HealthStatus)
async def get_health() -> HealthStatus:
    """Liveness probe: is the process alive? Never touches the database.

    Kubernetes uses a failing /health to RESTART the pod, so it must stay independent
    of downstream dependencies — a slow database must never cause a restart loop.
    """
    return HealthStatus(status="ok", version=VERSION)


async def _probe_postgres(session: AsyncSession) -> str:
    try:
        await session.execute(text("SELECT 1"))
        return "ok"
    except Exception as exc:  # noqa: BLE001 - readiness reports the failure, it must not raise
        return f"unreachable ({type(exc).__name__})"


async def _probe_redis() -> str:
    return "ok" if await RedisService.check() else "unreachable (ConnectionError)"


@router.get("/ready", response_model=ReadinessStatus, status_code=status.HTTP_200_OK)
async def get_readiness(
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> ReadinessStatus:
    """Readiness probe: 200 only when Postgres AND Redis are reachable.

    A failure returns 503 naming the dependency, and Kubernetes removes this pod from
    the Service endpoints instead of restarting it.
    """
    dependencies = {
        "postgres": await _probe_postgres(session),
        "redis": await _probe_redis(),
    }
    failed = next((name for name, state in dependencies.items() if state != "ok"), None)

    if failed:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessStatus(
            status="unready",
            version=VERSION,
            dependencies=dependencies,
            failed_dependency=failed,
        )

    return ReadinessStatus(status="ready", version=VERSION, dependencies=dependencies)
