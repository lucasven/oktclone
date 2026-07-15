# Auth + Profiles Design

**Date:** 2026-07-15
**Status:** Approved
**Branch:** `feat/auth-profiles`
**Delivery:** Two PRs — PR 1 (auth + profile stub), PR 2 (full profiles + photo upload). One spec covers both.

## Goal

Users can create an account (email/password or Google), log in and out, and have an orkut-style three-tab profile with a real photo, viewable by any logged-in user and editable by its owner.

## PR 1 — Auth

### Custom User model

New `accounts` app with a custom `User` model **before any user migrations exist** (retrofitting `AUTH_USER_MODEL` later is notoriously painful):

- Email is the login identifier; no username field.
- `USERNAME_FIELD = "email"`, custom `UserManager` (`create_user` / `create_superuser`).
- `AUTH_USER_MODEL = "accounts.User"`.

### django-allauth headless

`django-allauth[socialaccount]` in **headless mode** provides the entire auth JSON API — signup, login, logout, session status, password reset, and the Google OAuth flow — under `/_allauth/browser/v1/*`, session-cookie based (matches the existing DRF `SessionAuthentication`).

Configuration:

- Login by email + password; Google as a socialaccount provider.
- `HEADLESS_ONLY = True` (no allauth-rendered HTML pages); `HEADLESS_FRONTEND_URLS` maps flows (e.g. password reset) to SPA routes.
- Email verification: `optional` with the console email backend in dev; flips to `mandatory` + real SMTP via env later.
- Google `client_id` / `secret` from env vars (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`); the provider is configured in settings (`SOCIALACCOUNT_PROVIDERS`), no DB `SocialApp` rows needed.

CSRF: the SPA reads the `csrftoken` cookie and sends `X-CSRFToken`. Same-origin via the Vite dev proxy, so no CORS or cookie-domain issues.

### Profile stub

- `profiles` app with `Profile` model: `OneToOneField(User)` + `display_name` (PR 1 scope).
- Auto-created on signup via `post_save` signal on `User`.
- `GET /api/me` returns `{id, email, profile: {display_name, ...}}` for the logged-in user; 401 otherwise.

### Frontend (PR 1)

- Routes: `/login`, `/signup`.
- Auth state: TanStack Query on `/api/me` (`useMe()` hook).
- Router `beforeLoad` guard: unauthenticated users hitting protected routes are redirected to `/login`; logged-in users hitting `/login`/`/signup` are redirected home.
- Login/signup forms call allauth headless endpoints; a "Continue with Google" button starts the provider redirect flow.
- Logout button in the home page header.

## PR 2 — Profiles

### Data model

`Profile` grows explicit typed columns, grouped like orkut's three tabs. All optional except `display_name`.

| Tab | Fields |
|---|---|
| social | `display_name`, `photo`, `birthday` (date), `relationship_status` (choices: single / married / dating / open marriage / rather not say), `country`, `hometown`, `languages`, `about_me`, `interests`, `passions` |
| professional | `occupation`, `company`, `industry`, `education` |
| personal | `smoking` / `drinking` (choices: no / socially / regularly / rather not say), `sports`, `activities`, `books`, `music`, `movies` |

Text fields are `CharField`/`TextField` with sensible max lengths; choices are enforced server-side.

### Photo storage — Backblaze B2 (S3-compatible) from day 1

- `django-storages[s3]` + boto3; `STORAGES["default"]` is the S3 backend.
- `AWS_S3_ENDPOINT_URL`, bucket, and keys from env vars — pointed at Backblaze B2 in production.
- Photos are **served from the bucket's public URL**, never proxied through Django (a CDN can front the bucket later).
- Upload validation: Pillow-verified image, JPEG/PNG/WebP only, ≤ 5 MB; stored under `profiles/{user_id}/photo.<ext>`.
- **Local dev:** MinIO container in `docker-compose.yml` (same S3 code path, offline, no real creds); `.env` can switch to a real B2 dev bucket at will.
- **Tests:** storage overridden to Django's `InMemoryStorage` — no network, no containers needed in CI.

### API

- `GET /api/profiles/{user_id}/` — any authenticated user.
- `PATCH /api/profiles/me/` — owner updates fields.
- `POST /api/profiles/me/photo` — multipart upload; replaces existing photo.
- Field validation and photo checks live in plain serializer/service functions (mutation-testable; DRF-decorated views stay thin, per `core/services.py` pattern).

### Frontend (PR 2)

- `/profile/$userId` — three-tab profile view (social / professional / personal), photo, display name.
- `/settings/profile` — edit form for all fields + photo upload with preview.
- Both behind the auth guard.

## Error handling

- allauth headless returns structured field errors; forms map them to inline messages, with a generic form-level fallback.
- Photo upload rejections (type/size) return DRF 400 with a field error shown next to the upload control.
- Editing another user's profile → 403; unknown profile → 404.
- Unauthenticated API calls → 401 → SPA redirects to `/login`.

## Testing

- **Backend:** pytest — signup→login→me flow (via allauth endpoints), Google provider config sanity, profile auto-creation, profile CRUD permissions (owner vs stranger), photo validation (good/bad type/oversized), choices validation. Coverage ≥ 80% enforced; mutation gate ≥ 60% (`make mutate`).
- **Frontend:** Vitest — form validation/submission with mocked fetch, guard redirects, profile tabs render, upload preview. Coverage ≥ 80%; Stryker ≥ 60%.
- **Not tested here:** live Google OAuth and live B2 (external services); covered by configuration checks and allauth's own guarantees.

## Out of scope

- Friendships, scraps, testimonials, communities.
- Email change / account deletion flows.
- Image resizing/thumbnails (follow-up; B2 + CDN can handle originals for now).
- CDN configuration.
