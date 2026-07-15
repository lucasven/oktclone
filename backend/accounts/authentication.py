"""Session authentication that yields 401 (not 403) for anonymous requests.

DRF returns 403 for unauthenticated requests when the authenticator declares no
``WWW-Authenticate`` challenge, as stock ``SessionAuthentication`` does. The SPA
distinguishes "not logged in" (401 → redirect to /login) from "forbidden" (403),
so we advertise a challenge to get the 401.
"""

from rest_framework.authentication import SessionAuthentication
from rest_framework.request import Request


class SessionAuthenticationWith401(SessionAuthentication):
    def authenticate_header(self, request: Request) -> str:
        return "Session"
