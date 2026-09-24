import time
from typing import Callable, Dict, List
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Fixed-window IP-keyed rate limiter middleware defending endpoints from abuse."""

    # In-memory sliding window map: IP -> List[timestamps]
    _requests: Dict[str, List[float]] = {}
    _MAX_REQUESTS = 60  # 60 requests per minute
    _WINDOW_SECONDS = 60.0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Exempt health check endpoints from rate limiting
        if request.url.path in ["/api/health", "/api/ready"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        # Clean old timestamps
        history = self._requests.get(client_ip, [])
        valid_history = [t for t in history if now - t < self._WINDOW_SECONDS]

        if len(valid_history) >= self._MAX_REQUESTS:
            retry_after = int(self._WINDOW_SECONDS - (now - valid_history[0]))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "message": f"Rate limit exceeded. Maximum {self._MAX_REQUESTS} requests per minute allowed.",
                    "retry_after_seconds": max(1, retry_after),
                },
                headers={"Retry-After": str(max(1, retry_after))},
            )

        valid_history.append(now)
        self._requests[client_ip] = valid_history

        return await call_next(request)
