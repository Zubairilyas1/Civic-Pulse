import json
import logging
import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("civicpulse.access")
logging.basicConfig(level=logging.INFO, format="%(message)s")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for injecting X-Request-ID headers and emitting structured JSON access logs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract or generate unique request_id
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            log_data = {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms,
                "error": str(exc),
            }
            logger.error(json.dumps(log_data))
            raise exc

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Inject X-Request-ID into response headers
        response.headers["X-Request-ID"] = request_id

        log_data = {
            "event": "http_request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }
        logger.info(json.dumps(log_data))

        return response
