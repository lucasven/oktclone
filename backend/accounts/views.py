from typing import cast

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import User
from accounts.services import me_payload


@api_view(["GET"])
def me(request: Request) -> Response:
    """The logged-in user and their profile (401 when unauthenticated)."""
    return Response(me_payload(cast("User", request.user)))
