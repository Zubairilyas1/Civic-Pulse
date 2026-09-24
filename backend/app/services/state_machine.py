from app.schemas.complaint import StatusEnum


class InvalidStateTransitionException(Exception):
    """Exception raised when an invalid complaint status transition is requested."""

    def __init__(self, current_status: StatusEnum, target_status: StatusEnum):
        self.current_status = current_status
        self.target_status = target_status
        self.message = f"Invalid status transition from '{current_status.value}' to '{target_status.value}'."
        super().__init__(self.message)


class ComplaintStateMachine:
    """State machine enforcing valid lifecycle transitions for civic complaints."""

    # Allowed transitions map
    _ALLOWED_TRANSITIONS: dict[StatusEnum, set[StatusEnum]] = {
        StatusEnum.SUBMITTED: {StatusEnum.TRIAGED, StatusEnum.REJECTED},
        StatusEnum.TRIAGED: {StatusEnum.IN_PROGRESS, StatusEnum.REJECTED},
        StatusEnum.IN_PROGRESS: {StatusEnum.RESOLVED, StatusEnum.REJECTED},
        StatusEnum.RESOLVED: set(),  # Terminal state
        StatusEnum.REJECTED: set(),  # Terminal state
    }

    @classmethod
    def validate_transition(cls, current_status: StatusEnum, target_status: StatusEnum) -> None:
        """Validate if transition from current_status to target_status is allowed.

        Raises InvalidStateTransitionException if transition is forbidden.
        """
        if current_status == target_status:
            return  # No-op transition is allowed

        allowed = cls._ALLOWED_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionException(current_status, target_status)
