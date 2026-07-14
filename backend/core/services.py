"""Business logic for core. Keep views thin: mutmut cannot mutate decorated
functions, so logic that lives in views is invisible to mutation testing."""


def health_payload() -> dict[str, str]:
    """Payload reported by the liveness probe."""
    return {"status": "ok"}
