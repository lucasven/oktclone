import pytest

from accounts.models import User


@pytest.mark.django_db
def test_create_user_sets_email_password_and_default_flags() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    assert user.email == "alice@example.com"
    assert user.check_password("s3cret-pass")
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False


@pytest.mark.django_db
def test_create_user_normalizes_email_domain() -> None:
    user = User.objects.create_user("Alice@EXAMPLE.COM", "s3cret-pass")
    assert user.email == "Alice@example.com"


@pytest.mark.django_db
def test_create_user_without_email_raises() -> None:
    with pytest.raises(ValueError, match=r"^The email address must be set$"):
        User.objects.create_user("", "s3cret-pass")


@pytest.mark.django_db
def test_create_user_passes_extra_fields_through() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass", is_active=False)
    assert user.is_active is False


@pytest.mark.django_db
def test_create_user_without_password_has_unusable_password() -> None:
    user = User.objects.create_user("alice@example.com")
    assert not user.has_usable_password()


@pytest.mark.django_db
def test_create_superuser_sets_flags() -> None:
    user = User.objects.create_superuser("root@example.com", "s3cret-pass")
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.check_password("s3cret-pass")


@pytest.mark.django_db
def test_create_superuser_rejects_is_staff_false() -> None:
    with pytest.raises(ValueError, match=r"^Superuser must have is_staff=True$"):
        User.objects.create_superuser("root@example.com", "s3cret-pass", is_staff=False)


@pytest.mark.django_db
def test_create_superuser_rejects_is_superuser_false() -> None:
    with pytest.raises(ValueError, match=r"^Superuser must have is_superuser=True$"):
        User.objects.create_superuser("root@example.com", "s3cret-pass", is_superuser=False)


@pytest.mark.django_db
def test_user_str_is_email() -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    assert str(user) == "alice@example.com"


def test_username_field_is_email() -> None:
    assert User.USERNAME_FIELD == "email"
    assert User.REQUIRED_FIELDS == []
