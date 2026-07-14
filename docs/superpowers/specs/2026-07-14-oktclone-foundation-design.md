# oktclone Foundation Design — Stack, Git Hooks, Static Analysis

**Date:** 2026-07-14
**Status:** Approved
**Scope:** Project scaffolding only. No app features (profiles, scraps, communities) — those get their own design cycles later. This phase ends with an empty-but-guarded skeleton.

## Goal

oktclone is an orkut clone with real product ambition. Before any feature code, the repository gets a decided stack, git hooks, and static analysis (complexity, duplication, coverage, mutation testing) so quality is enforced from the first line of app code.

## Stack

| Layer | Choice |
|---|---|
| Backend | Django 5 + Django REST Framework, Python managed with `uv` |
| Frontend | Vite + React + TypeScript SPA, TanStack Router + TanStack Query, `pnpm` |
| Database | PostgreSQL via `docker-compose.yml` for local dev |
| Hook manager | Lefthook (single config for the polyglot monorepo) |

Rationale highlights:
- Django + DRF over FastAPI: batteries included — auth, ORM, migrations, and the admin panel (valuable for moderating a social network). Per-request speed is not the bottleneck.
- SPA over SSR (TanStack Start / Next.js): orkut-style apps are login-walled, so SEO is not needed; a static-hostable SPA avoids running a second server.
- Monorepo: one repo at the root; `backend/` and `frontend/` are independent units communicating only over the DRF HTTP API. Each can be developed, tested, and analyzed on its own.

## Repository layout

```
oktclone/
├── backend/            # Django project (uv, pyproject.toml)
├── frontend/           # Vite + React + TS (pnpm)
├── docs/superpowers/specs/
├── lefthook.yml        # git hooks config
├── .jscpd.json         # cross-language duplication thresholds
└── docker-compose.yml  # Postgres for local dev
```

## Static analysis

Configs live in each package (`pyproject.toml`, `eslint.config.js`) so tools behave identically in hooks, editors, and future CI.

### Python (backend/)
- **Ruff** — linting + formatting, with complexity-related rule groups enabled (including mccabe `C901`).
- **mypy** — strict mode.
- **Xenon** — hard complexity gate: fails when any function's cyclomatic complexity grade drops below B (absolute), modules/averages must hold A.

### TypeScript (frontend/)
- **ESLint** — typescript-eslint strict config + **eslint-plugin-sonarjs** for cognitive complexity limits.
- **Prettier** — formatting.
- **tsc --noEmit** — type checking.

### Cross-language
- **jscpd** — duplication detection over `backend/` and `frontend/` with a failure threshold.

### Test coverage thresholds
- Backend: **pytest-cov** with `--cov-fail-under=80` (lines + branches) in `pyproject.toml`.
- Frontend: **Vitest** v8 coverage with `thresholds: { lines: 80, branches: 80, functions: 80 }`.
- Coverage is enforced as part of the pre-push test step.

### Mutation testing
- Backend: **mutmut** (pytest-based); a small wrapper script fails if the killed-mutant ratio drops below 60%.
- Frontend: **StrykerJS** with the Vitest runner, `thresholds: { break: 60 }` failing the run below a 60% mutation score.
- Runs via explicit commands (`make mutate` in backend, `pnpm mutate` in frontend), NOT in git hooks — mutation runs take minutes and grow with the codebase. Slot into CI (nightly or per-PR) once CI exists.

## Git hooks (Lefthook)

| Hook | Speed | Checks |
|---|---|---|
| pre-commit | seconds, staged files only | Ruff lint+format on staged `.py`; ESLint + Prettier on staged `.ts/.tsx`. Auto-fixes are re-staged. |
| commit-msg | instant | Conventional Commits format check (commitlint). |
| pre-push | thorough | mypy, Xenon, tsc, jscpd, pytest (with coverage gate), Vitest (with coverage gate). |

Policy: commits stay fluid; nothing broken reaches the remote. Mutation testing intentionally excluded from hooks (see above).

## Error handling

- Hooks fail loudly with the underlying tool's output; no swallowed errors.
- Auto-fixable issues (formatting, simple lint) are fixed and re-staged in pre-commit rather than rejected.
- Thresholds (coverage 80%, Xenon grades, jscpd, Stryker break) are hard failures, adjustable only by editing the committed config.

## Verification plan

After scaffolding, prove the guardrails work by constructing a deliberately bad local commit — an unformatted, overly-complex, duplicated function with an untested branch — and demonstrating:
1. pre-commit fixes/rejects formatting and lint issues,
2. commit-msg rejects a non-conventional message,
3. pre-push rejects on complexity (Xenon), duplication (jscpd), type errors (mypy/tsc), and coverage shortfall,
4. `make mutate` / `pnpm mutate` run and report a score.

Then remove the bad code, leaving a clean skeleton where both test suites, all analyzers, and both mutation commands pass.

## Out of scope

- Any orkut features (auth, profiles, scraps, communities, friendships).
- CI pipeline (referenced as "later"; hooks are the enforcement layer for now).
- Deployment/hosting decisions.
