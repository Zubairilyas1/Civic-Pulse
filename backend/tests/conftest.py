"""Shared test bootstrap: a real PostgreSQL database, cleaned before every test.

Why a real database (and never an in-memory fake):
  The repository layer has no fallback storage on purpose — a fake would let the suite
  stay green while the application silently writes nowhere. These fixtures therefore
  create `civicpulse_test`, run the Alembic migrations against it, and truncate the
  complaints table between tests so every run is deterministic and repeatable.

Environment must be set BEFORE any `app.*` import: app.config reads DATABASE_URL /
REDIS_URL at import time and app/db/session.py builds the engine from them.
"""

import os
from pathlib import Path as _Path


def _default_database_url() -> str:
    """Pick the test database host automatically.

    Inside the compose stack Postgres answers as `db` (the network the spec requires);
    on the host and in CI it is `localhost:5432`. Docker installs no host forward for
    containers on an `internal: true` network, so local runs must go through the stack:
        docker compose run --rm backend pytest tests -v
    CI publishes Postgres/Redis as service containers on localhost instead.
    """
    host = "db" if _Path("/.dockerenv").exists() else "localhost"
    return f"postgresql+asyncpg://postgres:postgres@{host}:5432/civicpulse_test"


TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or _default_database_url()
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
# Redis DB 15 keeps the suite away from the developer's DB 0 cache.
if not os.environ.get("TEST_REDIS_URL"):
    os.environ["TEST_REDIS_URL"] = (
        "redis://redis:6379/15" if _Path("/.dockerenv").exists() else "redis://localhost:6379/15"
    )
os.environ["REDIS_URL"] = os.environ["TEST_REDIS_URL"]
# CI and local runs must never hit a hosted LLM — flaky tests train a team to ignore red.
os.environ["TRIAGE_PROVIDER"] = "simulated"

import asyncio  # noqa: E402
import subprocess  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

import asyncpg  # noqa: E402
import pytest  # noqa: E402
import redis as sync_redis  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB_NAME = TEST_DATABASE_URL.rsplit("/", 1)[-1]
STATS_CACHE_KEY = "civicpulse:cache:stats"


def _asyncpg_url(url: str) -> str:
    """asyncpg speaks the plain scheme; SQLAlchemy needs the `+asyncpg` dialect."""
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _admin_url() -> str:
    """URL of the maintenance database, used to CREATE DATABASE if missing."""
    return _asyncpg_url(TEST_DATABASE_URL).rsplit("/", 1)[0] + "/postgres"


async def _ensure_database() -> None:
    try:
        conn = await asyncpg.connect(_admin_url())
    except OSError as exc:
        raise RuntimeError(
            f"Cannot reach the test database at {_admin_url()}.\n"
            "The dev stack keeps Postgres on an internal network (no host port), so run "
            "the suite inside it:\n"
            "    docker compose run --rm backend pytest tests -v\n"
            "In CI, Postgres must be running as a service container on localhost:5432."
        ) from exc
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME)
        if not exists:
            await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    finally:
        await conn.close()


def _run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(BACKEND_DIR / "alembic.ini"), "upgrade", "head"],
        cwd=BACKEND_DIR,
        check=True,
    )


def _purge_test_state() -> None:
    """Empty complaints and drop every cache the application may have warmed."""

    async def _truncate() -> None:
        conn = await asyncpg.connect(_asyncpg_url(TEST_DATABASE_URL))
        try:
            await conn.execute("TRUNCATE TABLE complaints")
        finally:
            await conn.close()

    asyncio.run(_truncate())

    # Redis DB 15 (sync client: safe to call outside the application's event loop).
    try:
        client = sync_redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=0.5)
        client.delete(STATS_CACHE_KEY)
        client.close()
    except Exception:
        pass  # A missing Redis must not fail the suite; the stats path degrades gracefully.

    # Drop memoised connections so the next request reconnects on its own event loop.
    from app.db.redis import RedisService
    from app.middleware.rate_limiter import RateLimiterMiddleware

    RedisService._redis_client = None
    RedisService._connection_attempted = False
    RedisService._memory_cache.clear()
    RateLimiterMiddleware._requests.clear()


@pytest.fixture(scope="session", autouse=True)
def test_database():
    """One database + migrations per pytest session, then hand a clean slate to each test."""
    asyncio.run(_ensure_database())
    _run_migrations()
    _purge_test_state()
    yield


@pytest.fixture(autouse=True)
def isolated_state():
    """Every test starts from an empty table, a cold stats cache and a fresh rate-limit window."""
    _purge_test_state()
    yield


@pytest.fixture(scope="session")
def client():
    """One TestClient for the whole session, so every request shares a single event loop.

    A module-level ``TestClient(app)`` opens a fresh anyio portal (event loop) per
    request; pooled asyncpg connections then belong to a dead loop and the next
    request dies with "attached to a different loop". The context manager also runs
    the app's lifespan exactly once.
    """
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
