"""Auto-create a Profile for every new User.

The ``@receiver``-decorated hook stays a one-line trampoline: mutmut cannot
mutate decorated functions, so the actual logic lives in the plain
``ensure_profile`` function where it is mutation-testable.
"""

from typing import Any

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import User
from profiles.models import Profile


def ensure_profile(user: User, created: bool) -> None:
    """Create the profile for a freshly created user; do nothing on updates."""
    if created:
        Profile.objects.create(user=user)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_on_user_creation(
    sender: type[User], instance: User, created: bool, **kwargs: Any
) -> None:
    ensure_profile(instance, created)
