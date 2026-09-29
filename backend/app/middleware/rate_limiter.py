import logging
import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.redis import RedisService

logger = logging.getLogger("civicpulse.rate_limiter")


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Fixed-window IP rate limiter backed by Redis (contract §2.4, Job 2).

    The counter lives in Redis, never in this process: with the HPA scaling the
    backend to four pods an in-process dictionary would permit four times the
    intended traffic. One key per (IP, minute) — `ratelimit:<ip>:<window>` —
    shared by every replica.

    Degradation policy: if Redis itself is unreachable the middleware fails open
    with a WARNING. `/ready` already answers 503 for a dead Redis, so hiding the
    real outage behind 429s would be worse than letting requests through.
    """

    _MAX_REQUESTS = 60  # 60 requests per minute
    _WINDOW_SECONDS = 60.0
    # Kubernetes probes must never be throttled — a 429 probe looks like an outage.
    _EXEMPT_PATHS = ("/health", "/ready", "/api/health", "/api/ready")

    async def dispatch(self, request: Request, call_next: Callable[..., Awaitable[Response]]) -> Response:
        if request.url.path in self._EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window = int(now // self._WINDOW_SECONDS)
        key = f"ratelimit:{client_ip}:{window}"

        count = await RedisService.incr_window(key, int(self._WINDOW_SECONDS) * 2)

        if count is None:
            logger.warning("Rate limiter degraded: Redis unreachable; request allowed without counting.")
            return await call_next(request)

        if count > self._MAX_REQUESTS:
            retry_after = max(1, int(self._WINDOW_SECONDS - (now % self._WINDOW_SECONDS)))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded. Maximum {self._MAX_REQUESTS} requests per minute allowed.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
