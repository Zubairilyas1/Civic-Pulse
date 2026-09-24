import hashlib
import time
from typing import Dict, Optional, Tuple
from app.schemas.complaint import TriageResult


class TriageCache:
    """In-memory content-hash cache for triage results with 24-hour TTL."""

    # Storage dictionary mapping hash_key -> (TriageResult, timestamp)
    _cache: Dict[str, Tuple[TriageResult, float]] = {}
    _TTL_SECONDS = 24 * 3600  # 24 hours

    @classmethod
    def _generate_key(cls, title: str, description: str) -> str:
        combined = f"{title.strip().lower()}:{description.strip().lower()}"
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    @classmethod
    def get(cls, title: str, description: str) -> Optional[TriageResult]:
        key = cls._generate_key(title, description)
        if key in cls._cache:
            result, timestamp = cls._cache[key]
            if time.time() - timestamp < cls._TTL_SECONDS:
                return result
            # Expired
            del cls._cache[key]
        return None

    @classmethod
    def set(cls, title: str, description: str, result: TriageResult) -> None:
        key = cls._generate_key(title, description)
        cls._cache[key] = (result, time.time())
