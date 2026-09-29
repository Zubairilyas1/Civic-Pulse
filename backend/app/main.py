import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routes import complaints, health, meta, metrics, stats

logger = logging.getLogger("civicpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Initializing CivicPulse Backend Service...")
    yield
    # Graceful shutdown (contract §2.2). On SIGTERM uvicorn stops accepting new
    # connections, finishes in-flight requests, then runs this block — so pool
    # connections are closed here and the pod exits cleanly during a rolling update.
    logger.info("Executing graceful shutdown for CivicPulse Backend Service...")
    from app.db.redis import RedisService
    from app.db.session import engine

    await RedisService.shutdown()
    await engine.dispose()
    logger.info("Graceful shutdown complete: redis and database pools closed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CivicPulse Backend API for Civic Complaint Management & AI Triage",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Add Middleware (Rate Limiter + Request Logger)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Contract override: request validation errors return 400 with a field-level body, not 422.
register_exception_handlers(app)

# Include API Routers
# health is mounted twice: the contract in §2 declares GET /health and GET /ready at the
# root, while Kubernetes probes and the frontend use the /api-prefixed copies.
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(stats.router, prefix=settings.API_V1_STR)
app.include_router(meta.router, prefix=settings.API_V1_STR)
# /metrics is contract-stated at the root (Prometheus scrapes it there); the
# /api copy exists so everything under one prefix stays reachable.
app.include_router(metrics.router)
app.include_router(metrics.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "stats": f"{settings.API_V1_STR}/stats",
    }
