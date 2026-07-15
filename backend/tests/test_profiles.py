import pytest

from accounts.models import User
from profiles.models import Profile


@pytest.mark.django_db
def test_profile_auto_created_on_user_creation() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    assert user.profile is not None
    assert user.profile.display_name == ""


@pytest.mark.django_db
def test_saving_user_again_does_not_duplicate_profile() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    user.save()
    assert Profile.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_profile_str_names_its_user() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    assert str(user.profile) == "Profile of alice@example.com"
