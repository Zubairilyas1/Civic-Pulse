from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

VALIDATION_ERROR_BODY = {
    "error": "ValidationError",
    "message": "Request validation failed",
}


def _field_name(loc: tuple[object, ...]) -> str:
    """['body', 'title'] -> 'title'; ['query', 'page'] -> 'page'; ['body'] -> 'request body'."""
    parts = [str(p) for p in loc]
    if len(parts) <= 1:
        return parts[0] if parts else "request"
    return ".".join(parts[1:])


async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Translate FastAPI's 422 into the contract's 400 with a field-level error body.

    Shape:
        {"detail": {"error": "ValidationError",
                    "message": "Request validation failed",
                    "fields": {"title": ["String should have at least 5 characters"]}}}
    """
    fields: dict[str, list[str]] = {}
    for error in exc.errors():
        field = _field_name(tuple(error.get("loc", ())))
        fields.setdefault(field, []).append(str(error.get("msg", "invalid value")))

    return JSONResponse(
        status_code=400,
        content={"detail": {**VALIDATION_ERROR_BODY, "fields": fields}},
    )


def register_exception_handlers(app: FastAPI) -> None:
    # Starlette's handler type is (Request, Exception); the narrower
    # RequestValidationError parameter is the documented FastAPI pattern.
    app.add_exception_handler(RequestValidationError, request_validation_handler)  # type: ignore[arg-type]
