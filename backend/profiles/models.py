from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Per-user profile, auto-created on signup (see ``profiles.signals``)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=100, blank=True)

    def __str__(self) -> str:
        return f"Profile of {self.user}"
