import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routes import complaints, health, meta, stats

logger = logging.getLogger("civicpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CivicPulse Backend Service...")
    yield
    logger.info("Executing graceful shutdown for CivicPulse Backend Service...")


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

# Include API Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(stats.router, prefix=settings.API_V1_STR)
app.include_router(meta.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "stats": f"{settings.API_V1_STR}/stats",
    }
