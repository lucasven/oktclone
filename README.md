# oktclone

An orkut clone. Django + DRF API, React SPA frontend.

## Stack

- **backend/** — Django 5.2 + Django REST Framework, managed with [uv](https://docs.astral.sh/uv/)
- **frontend/** — Vite + React + TypeScript, TanStack Router + TanStack Query, managed with pnpm
- **PostgreSQL** — `docker compose up -d db`

## Getting started

```sh
pnpm install            # root tooling (lefthook, commitlint, jscpd)
pnpm exec lefthook install

cd backend && uv sync
cd frontend && pnpm install

docker compose up -d db
cd backend && uv run python manage.py migrate && make dev   # API on :8000
cd frontend && pnpm dev                                     # SPA on :5173 (proxies /api)
```

## Quality gates

| When | What |
|---|---|
| pre-commit | Ruff (lint+format) on staged Python; ESLint + Prettier on staged TS. Auto-fixes are re-staged. |
| commit-msg | Conventional Commits (commitlint) |
| pre-push | mypy, Xenon (complexity), pytest (coverage ≥ 80%), tsc, ESLint, Vitest (coverage ≥ 80%), jscpd (duplication) |
| manual / CI | Mutation testing: `make mutate` (backend, mutmut), `pnpm mutate` (frontend, Stryker) — both gate at 60% score |

Backend: `make check` runs lint + typecheck + complexity + tests.
Frontend: `pnpm lint / typecheck / test / format`.

Design docs live in `docs/superpowers/specs/`.
