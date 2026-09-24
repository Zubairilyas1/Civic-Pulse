from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintResponse,
    PriorityEnum,
    StatusEnum,
    StatusUpdate,
)
from app.services.complaint_service import ComplaintService
from app.services.state_machine import InvalidStateTransitionException

router = APIRouter(prefix="/complaints", tags=["Complaints"])
complaint_service = ComplaintService()


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(complaint: ComplaintCreate):
    """Submit a new civic complaint."""
    return await complaint_service.create_complaint(complaint)


@router.get("", response_model=list[ComplaintResponse])
async def list_complaints(
    category: CategoryEnum | None = None,
    priority: PriorityEnum | None = None,
    status: StatusEnum | None = None,
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


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(complaint_id: str, payload: StatusUpdate):
    """Update complaint status with strict state machine validation.

    Raises 409 Conflict on invalid status transition.
    Raises 404 Not Found if complaint does not exist.
    """
    try:
        return await complaint_service.update_status(
            complaint_id=complaint_id, target_status=payload.status
        )
    except InvalidStateTransitionException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "InvalidStatusTransition",
                "message": e.message,
                "current_status": e.current_status,
                "target_status": e.target_status,
            },
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
