import pytest
from django.test import Client

from accounts.models import User


@pytest.mark.django_db
def test_me_returns_contract_shape_when_logged_in(client: Client) -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    user.profile.display_name = "Alice"
    user.profile.save()
    client.force_login(user)

    response = client.get("/api/me/")

    assert response.status_code == 200
    assert response.json() == {
        "id": user.id,
        "email": "alice@example.com",
        "profile": {"display_name": "Alice"},
    }


def test_me_returns_401_when_anonymous(client: Client) -> None:
    response = client.get("/api/me/")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Session"


@pytest.mark.django_db
def test_me_rejects_post(client: Client) -> None:
    user = User.objects.create_user("alice@example.com", "s3cret-pass")
    client.force_login(user)
    response = client.post("/api/me/")
    assert response.status_code == 405
