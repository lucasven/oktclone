"""End-to-end auth flows through the allauth headless API.

The Django test client skips CSRF enforcement, so no CSRF token dance is
needed here (the SPA fetches one from /_allauth/browser/v1/auth/session).
"""

import pytest
from django.test import Client

from accounts.models import User
from profiles.models import Profile

SIGNUP_URL = "/_allauth/browser/v1/auth/signup"
LOGIN_URL = "/_allauth/browser/v1/auth/login"
SESSION_URL = "/_allauth/browser/v1/auth/session"


@pytest.mark.django_db
def test_signup_creates_user_with_profile_and_logs_in(client: Client) -> None:
    response = client.post(
        SIGNUP_URL,
        {"email": "alice@example.com", "password": "correct-horse-battery"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["meta"]["is_authenticated"] is True
    user = User.objects.get(email="alice@example.com")
    assert user.check_password("correct-horse-battery")
    assert Profile.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_signup_with_weak_password_creates_nothing(client: Client) -> None:
    response = client.post(
        SIGNUP_URL,
        {"email": "alice@example.com", "password": "123"},
        content_type="application/json",
    )

    assert response.status_code == 400
    assert User.objects.count() == 0


@pytest.mark.django_db
def test_login_sets_session(client: Client) -> None:
    User.objects.create_user("alice@example.com", "correct-horse-battery")

    response = client.post(
        LOGIN_URL,
        {"email": "alice@example.com", "password": "correct-horse-battery"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["meta"]["is_authenticated"] is True
    session = client.get(SESSION_URL)
    assert session.status_code == 200
    assert session.json()["data"]["user"]["email"] == "alice@example.com"


@pytest.mark.django_db
def test_login_with_wrong_password_fails(client: Client) -> None:
    User.objects.create_user("alice@example.com", "correct-horse-battery")

    response = client.post(
        LOGIN_URL,
        {"email": "alice@example.com", "password": "wrong"},
        content_type="application/json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_signup_then_me_returns_new_user(client: Client) -> None:
    client.post(
        SIGNUP_URL,
        {"email": "alice@example.com", "password": "correct-horse-battery"},
        content_type="application/json",
    )

    response = client.get("/api/me/")

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert body["profile"] == {"display_name": ""}
