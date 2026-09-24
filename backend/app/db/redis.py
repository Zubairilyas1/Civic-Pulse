import logging
import time
from typing import Dict, Optional, Tuple

import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("civicpulse.redis")


class RedisService:
    """Async Redis Service with in-memory fallback for testing and offline environments."""

    _redis_client: Optional[aioredis.Redis] = None
    _memory_cache: Dict[str, Tuple[str, float]] = {}

    @classmethod
    async def get_client(cls) -> Optional[aioredis.Redis]:
        if cls._redis_client is None:
            try:
                client = aioredis.from_url(
                    settings.REDIS_URL, decode_responses=True, socket_timeout=2.0
                )
                await client.ping()
                cls._redis_client = client
                logger.info("Connected to Redis successfully.")
            except Exception as exc:
                logger.warning(f"Redis connection unavailable ({str(exc)}). Using in-memory fallback cache.")
                cls._redis_client = None
        return cls._redis_client

    @classmethod
    async def get(cls, key: str) -> Optional[str]:
        client = await cls.get_client()
        if client:
            try:
                return await client.get(key)
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
    async def set(cls, key: str, value: str, ex: Optional[int] = None) -> None:
        client = await cls.get_client()
        if client:
            try:
                await client.set(key, value, ex=ex)
                return
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
                return
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
