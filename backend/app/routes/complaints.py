from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
)
from app.services.complaint_service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])
complaint_service = ComplaintService()


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(complaint: ComplaintCreate):
    """Submit a new civic complaint."""
    return await complaint_service.create_complaint(complaint)


@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    category: Optional[CategoryEnum] = None,
    priority: Optional[PriorityEnum] = None,
    status: Optional[StatusEnum] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """Retrieve list of complaints with filtering and pagination."""
    return await complaint_service.list_complaints(
        category=category,
        priority=priority,
        status=status,
        skip=skip,
        limit=limit,
    )


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(complaint_id: str):
    """Get complaint details by ID."""
    complaint = await complaint_service.get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )
    return complaint
