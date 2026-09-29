import contextvars
import json
import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.metrics import HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL

# Set per-request by RequestLoggingMiddleware so EVERY line emitted while a request
# is in flight carries its request_id — not just the access log (contract §2.2).
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")


class _RequestIdFilter(logging.Filter):
    """Stamps record.request_id from the per-request context (None outside a request)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or None
        return True


class JsonLogFormatter(logging.Formatter):
    """One JSON object per line on stdout (contract §2.2).

    Messages that are already a JSON object (the access log, structured events)
    keep their keys and gain level/logger/request_id; every other message —
    provider warnings, fallback notices, uvicorn startup — is wrapped, so no
    line escapes the contract's "JSON to stdout, request_id on every line" rule.
    """

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        try:
            parsed = json.loads(message)
            payload = parsed if isinstance(parsed, dict) else {"message": str(parsed)}
        except (ValueError, TypeError):
            payload = {"message": message}
        payload.setdefault("timestamp", datetime.now(UTC).isoformat())
        payload.setdefault("level", record.levelname)
        payload.setdefault("logger", record.name)
        payload.setdefault("request_id", getattr(record, "request_id", None))
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def _install_root_logging() -> None:
    if logging.getLogger().handlers:
        return  # pytest or a host runner already configured logging; do not fight it.
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    handler.addFilter(_RequestIdFilter())
    logging.basicConfig(level=logging.INFO, handlers=[handler])


_install_root_logging()

logger = logging.getLogger("civicpulse.access")


def _route_template(request: Request) -> str:
    """Route template (e.g. /api/complaints/{complaint_id}) keeps metric cardinality bounded."""
    route = request.scope.get("route")
    return getattr(route, "path", None) or "unmatched"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for injecting X-Request-ID headers and emitting structured JSON access logs.

    Also feeds the Prometheus request count and latency histogram (contract §2.2 /metrics).
    """

    async def dispatch(self, request: Request, call_next: Callable[..., Awaitable[Response]]) -> Response:
        # Extract or generate unique request_id
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        # The context var (not request state) is what arbitrary loggers can read.
        context_token = request_id_var.set(request_id)

        start_time = time.perf_counter()

        try:
            try:
                response: Response = await call_next(request)
            except Exception as exc:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                route = _route_template(request)
                HTTP_REQUESTS_TOTAL.labels(request.method, route, "500").inc()
                HTTP_REQUEST_DURATION_SECONDS.labels(request.method, route).observe(duration_ms / 1000)
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
                raise

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Inject X-Request-ID into response headers
            response.headers["X-Request-ID"] = request_id

            route = _route_template(request)
            HTTP_REQUESTS_TOTAL.labels(request.method, route, str(response.status_code)).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(request.method, route).observe(duration_ms / 1000)

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
        finally:
            request_id_var.reset(context_token)
