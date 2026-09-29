import logging
import time

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("civicpulse.redis")


class RedisService:
    """Async Redis Service with in-memory fallback for testing and offline environments."""

    _redis_client: aioredis.Redis | None = None
    _connection_attempted: bool = False
    _memory_cache: dict[str, tuple[str, float]] = {}

    @classmethod
    async def reset(cls) -> None:
        """Reset connection state for testing."""
        cls._redis_client = None
        cls._connection_attempted = False
        cls._memory_cache.clear()

    @classmethod
    async def shutdown(cls) -> None:
        """Close the live Redis connection during graceful shutdown (SIGTERM)."""
        client = cls._redis_client
        cls._redis_client = None
        cls._connection_attempted = False
        cls._memory_cache.clear()
        if client is not None:
            try:
                await client.aclose()
            except Exception:  # noqa: BLE001 — shutdown must never raise
                try:
                    await client.close()  # redis-py < 5 spelling
                except Exception:
                    pass

    @classmethod
    async def get_client(cls) -> aioredis.Redis | None:
        if cls._redis_client is None and not cls._connection_attempted:
            cls._connection_attempted = True
            try:
                client = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.5)
                await client.ping()
                cls._redis_client = client
                logger.info("Connected to Redis successfully.")
            except Exception as exc:
                logger.warning(f"Redis connection unavailable ({str(exc)}). Using in-memory fallback cache.")
                cls._redis_client = None
        return cls._redis_client

    @classmethod
    async def check(cls) -> bool:
        """Live reachability probe used by GET /ready.

        Unlike get_client() this never answers from stale state: it pings the cached
        client, and if that fails it drops the memoised connection and retries, so a
        pod that lost Redis during startup can become ready again once Redis returns.
        """
        client = await cls.get_client()
        if client is not None:
            try:
                await client.ping()
                return True
            except Exception:
                cls._redis_client = None
                cls._connection_attempted = False

        # First attempt (or the cached client just failed): allow a fresh connect.
        cls._connection_attempted = False
        client = await cls.get_client()
        if client is None:
            # Leave the memo clear so the next probe retries instead of reporting stale failure.
            cls._connection_attempted = False
            return False
        try:
            await client.ping()
            return True
        except Exception:
            cls._redis_client = None
            cls._connection_attempted = False
            return False

    @classmethod
    async def get(cls, key: str) -> str | None:
        client = await cls.get_client()
        if client:
            try:
                value = await client.get(key)
                return value.decode() if isinstance(value, bytes) else value
            except Exception:
                pass

        # In-memory fallback
        if key in cls._memory_cache:
            val, expiry = cls._memory_cache[key]
            if expiry == 0 or time.time() < expiry:
                return val
            del cls._memory_cache[key]
        return None

    @classmethod
    async def set(cls, key: str, value: str, ex: int | None = None) -> None:
        client = await cls.get_client()
        if client:
            try:
                await client.set(key, value, ex=ex)
            except Exception:
                pass

        expiry = (time.time() + ex) if ex else 0.0
        cls._memory_cache[key] = (value, expiry)

    @classmethod
    async def delete(cls, key: str) -> None:
        client = await cls.get_client()
        if client:
            try:
                await client.delete(key)
            except Exception:
                pass

        cls._memory_cache.pop(key, None)

    @classmethod
    async def flush_all(cls) -> None:
        client = await cls.get_client()
        if client:
            try:
                await client.flushdb()
                return
            except Exception:
                pass
        cls._memory_cache.clear()
