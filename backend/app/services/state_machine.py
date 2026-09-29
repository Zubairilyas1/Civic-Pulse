from app.schemas.complaint import StatusEnum


class InvalidStateTransitionException(Exception):
    """Exception raised when an invalid complaint status transition is requested."""

    def __init__(self, current_status: StatusEnum, target_status: StatusEnum):
        self.current_status = current_status
        self.target_status = target_status
        self.message = f"Invalid status transition from '{current_status.value}' to '{target_status.value}'."
        super().__init__(self.message)


class ComplaintStateMachine:
    """State machine enforcing valid lifecycle transitions for civic complaints.

    The contract's transition table (§2.2): open → in_progress → resolved;
    open → rejected; in_progress → rejected. resolved and rejected are terminal.
    Anything else — including a no-op patch to the current status — is a 409.
    """

    # Allowed transitions map
    _ALLOWED_TRANSITIONS: dict[StatusEnum, set[StatusEnum]] = {
        StatusEnum.OPEN: {StatusEnum.IN_PROGRESS, StatusEnum.REJECTED},
        StatusEnum.IN_PROGRESS: {StatusEnum.RESOLVED, StatusEnum.REJECTED},
        StatusEnum.RESOLVED: set(),  # Terminal state
        StatusEnum.REJECTED: set(),  # Terminal state
    }

    @classmethod
    def validate_transition(cls, current_status: StatusEnum, target_status: StatusEnum) -> None:
        """Validate if transition from current_status to target_status is allowed.

        Raises InvalidStateTransitionException if transition is forbidden —
        including same-to-same, which is not in the contract's table.
        """
        allowed = cls._ALLOWED_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionException(current_status, target_status)
