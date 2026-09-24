import re


class PromptGuardrail:
    """Security guardrail shielding LLM prompts against prompt injection attacks."""

    _INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?(previous|prior)\s+instructions?",
        r"disregard\s+(all\s+)?rules",
        r"system\s+prompt",
        r"override\s+priority",
        r"you\s+are\s+now\s+a",
        r"jailbreak",
        r"act\s+as\s+an?\s+unrestricted",
    ]

    @classmethod
    def sanitize(cls, text: str) -> tuple[str, bool]:
        """Sanitize text and detect prompt injection attempts.

        Returns (clean_text, is_injection_detected).
        """
        is_detected = False
        clean_text = text

        for pattern in cls._INJECTION_PATTERNS:
            if re.search(pattern, clean_text, re.IGNORECASE):
                is_detected = True
                clean_text = re.sub(
                    pattern, "[REDACTED_INJECTION]", clean_text, flags=re.IGNORECASE
                )

        return clean_text, is_detected
