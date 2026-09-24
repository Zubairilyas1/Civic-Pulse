from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import complaints, health

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CivicPulse Backend API for Civic Complaint Management & AI Triage",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware configuration
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


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
