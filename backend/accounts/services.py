"""Business logic for accounts. Keep views thin: mutmut cannot mutate decorated
functions, so logic that lives in views is invisible to mutation testing."""

from accounts.models import User


def me_payload(user: User) -> dict[str, object]:
    """Contract shape for ``GET /api/me/``: the logged-in user and their profile."""
    return {
        "id": user.id,
        "email": user.email,
        "profile": {"display_name": user.profile.display_name},
    }
