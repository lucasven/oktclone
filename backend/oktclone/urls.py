"""Root URL configuration for oktclone."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/", include("accounts.urls")),
    # Even in headless mode the provider endpoints are still needed for the
    # OAuth handshake (e.g. Google's redirect back to us). HEADLESS_ONLY=True
    # disables the allauth-rendered HTML account views.
    path("accounts/", include("allauth.urls")),
    path("_allauth/", include("allauth.headless.urls")),
]
