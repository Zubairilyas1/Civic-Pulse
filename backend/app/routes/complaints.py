from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.complaint import (
    CategoryEnum,
    ComplaintCreate,
    ComplaintListResponse,
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
async def create_complaint(
    complaint: ComplaintCreate,
    session: AsyncSession = Depends(get_db_session),
) -> ComplaintResponse:
    """Submit a new civic complaint."""
    return await complaint_service.create_complaint(complaint, session=session)


@router.get("", response_model=ComplaintListResponse)
async def list_complaints(
    category: CategoryEnum | None = None,
    priority: PriorityEnum | None = None,
    status: StatusEnum | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> ComplaintListResponse:
    """Retrieve one filtered page of complaints plus the filtered total."""
    return await complaint_service.list_complaints(
        category=category,
        priority=priority,
        status=status,
        page=page,
        page_size=page_size,
        session=session,
    )


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ComplaintResponse:
    """Get complaint details by ID."""
    complaint = await complaint_service.get_complaint(complaint_id, session=session)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )
    return complaint


@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    complaint_id: str,
    payload: StatusUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> ComplaintResponse:
    """Update complaint status with strict state machine validation.

    Raises 409 Conflict on invalid status transition.
    Raises 404 Not Found if complaint does not exist.
    """
    try:
        return await complaint_service.update_status(
            complaint_id=complaint_id,
            target_status=payload.status,
            session=session,
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
