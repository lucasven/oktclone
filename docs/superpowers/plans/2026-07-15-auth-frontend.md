# Auth Frontend (PR 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login/signup/logout UI wired to the allauth headless API with a TanStack Query auth guard, reusable form primitives, and full quality-gate compliance.

**Architecture:** Plain fetch client (`lib/auth.ts` + `lib/csrf.ts`) against the allauth/`/api/me/` contract; auth state lives in TanStack Query under `['me']` (401 → `null`, not error); code-based TanStack Router routes with `beforeLoad` guards using `queryClient.ensureQueryData`; shared UI primitives (`Button`, `TextField`, `FormError`, `AuthCard`) keep login/signup pages small and duplication-free.

**Tech Stack:** React 19, TanStack Router (code-based), TanStack Query 5, Vitest + Testing Library, Stryker, no new dependencies.

## Global Constraints

- Work ONLY inside `frontend/` (plus this plan file). NO git commit / git push — the orchestrator commits.
- TypeScript strict + `noUncheckedIndexedAccess`; prettier: no semicolons, single quotes; named exports only.
- No new dependencies. Controlled `useState` forms (no react-hook-form).
- All mutating requests send `X-CSRFToken` from the `csrftoken` cookie.
- Coverage thresholds 80% (lines/branches/functions/statements); Stryker break 60; jscpd threshold 1% with minTokens 50 — login/signup pages must share structure via AuthCard/ui components.
- eslint `--max-warnings 0` with strictTypeChecked + sonarjs (`cognitive-complexity` ≤ 15, `no-duplicate-string` active in non-test files).
- Quality gate commands (from `frontend/`): `pnpm run lint`, `pnpm run format:check`, `pnpm exec tsc -b`, `pnpm run test`, `pnpm run mutate`, and `cd .. && pnpm exec jscpd`.

## Backend API Contract (code against exactly this)

- `GET /api/me/` → 200 `{"id": number, "email": string, "profile": {"display_name": string}}` | 401 `{"detail": string}`
- `POST /_allauth/browser/v1/auth/signup` body `{"email", "password"}` → 200 session established; 400 `{"status": 400, "errors": [{"message", "code", "param"}]}`; 401 with `{"data": {"flows": [...]}}` = email verification pending → "check your email" info state.
- `POST /_allauth/browser/v1/auth/login` body `{"email", "password"}` → 200; 400 same error shape.
- `DELETE /_allauth/browser/v1/auth/session` → 401 response is EXPECTED and means logout success.
- Google: browser navigation via form POST (not fetch) to `/_allauth/browser/v1/auth/provider/redirect` with fields `{provider: "google", callback_url: "/", process: "login"}` + CSRF token.

## File Structure

```
frontend/
  vite.config.ts                      (modify: proxy /_allauth)
  src/
    index.css                         (modify: append card/form/button styles)
    router.tsx                        (modify: routes + guards + router context)
    main.tsx                          (modify: pass queryClient into router context)
    components/
      ui/
        Button.tsx / Button.test.tsx
        TextField.tsx / TextField.test.tsx
        FormError.tsx / FormError.test.tsx
      AuthCard.tsx / AuthCard.test.tsx
    lib/
      csrf.ts / csrf.test.ts
      auth.ts / auth.test.ts
    hooks/
      useMe.ts / useMe.test.tsx
    routes/
      home.tsx (modify) / home.test.tsx (modify)
      login.tsx / login.test.tsx
      signup.tsx / signup.test.tsx
```

---

### Task 1: Vite proxy + CSS foundations

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: CSS classes `auth-card`, `auth-card-title`, `field`, `field-label`, `field-input`, `field-error`, `form-error`, `form-info`, `btn`, `btn-primary`, `btn-secondary`, `auth-alt`, `home-header` used by later tasks.

- [ ] **Step 1: Add `/_allauth` to the Vite proxy**

In `frontend/vite.config.ts` change:

```ts
    proxy: {
      '/api': 'http://localhost:8000',
    },
```

to:

```ts
    proxy: {
      '/api': 'http://localhost:8000',
      '/_allauth': 'http://localhost:8000',
    },
```

- [ ] **Step 2: Append component styles to `frontend/src/index.css`**

Append at the end of the file:

```css
.auth-card {
  margin: 48px auto;
  max-width: 360px;
  padding: 24px 28px 32px;
  text-align: left;
  background: #e8eefa;
  border: 1px solid #b8c7e0;
  border-radius: 8px;
  box-shadow: var(--shadow);
}

@media (prefers-color-scheme: dark) {
  .auth-card {
    background: #1d2331;
    border-color: #33415c;
  }
}

.auth-card-title {
  margin: 0 0 16px;
  font-size: 24px;
  color: #3b5998;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
}

.field-input {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-h);
}

.field-error,
.form-error {
  font-size: 14px;
  color: #c0392b;
}

.form-error {
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid #c0392b;
  border-radius: 4px;
  background: rgba(192, 57, 43, 0.08);
}

.form-info {
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px solid #3b5998;
  border-radius: 4px;
  background: rgba(59, 89, 152, 0.08);
  font-size: 14px;
}

.btn {
  font: inherit;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b5998;
  color: #fff;
}

.btn-secondary {
  background: var(--bg);
  color: var(--text-h);
  border-color: var(--border);
}

.auth-alt {
  margin-top: 16px;
  font-size: 14px;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 3: Verify formatting and typecheck still pass**

Run from `frontend/`: `pnpm run format:check && pnpm exec tsc -b`
Expected: both pass. If prettier complains, run `pnpm run format` and re-check.

---

### Task 2: `lib/csrf.ts` — cookie + CSRF header helpers (TDD)

**Files:**
- Create: `frontend/src/lib/csrf.ts`
- Test: `frontend/src/lib/csrf.test.ts`

**Interfaces:**
- Produces: `getCookie(name: string): string | null`, `csrfHeader(): Record<string, string>` (returns `{ 'X-CSRFToken': token }` or `{}` when no cookie).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/csrf.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'

import { csrfHeader, getCookie } from './csrf'

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
  }
}

describe('getCookie', () => {
  afterEach(clearCookies)

  it('returns the value of the named cookie', () => {
    document.cookie = 'csrftoken=abc123'
    expect(getCookie('csrftoken')).toBe('abc123')
  })

  it('finds the cookie among multiple cookies', () => {
    document.cookie = 'other=zzz'
    document.cookie = 'csrftoken=abc123'
    expect(getCookie('csrftoken')).toBe('abc123')
  })

  it('returns null when the cookie is absent', () => {
    expect(getCookie('csrftoken')).toBeNull()
  })

  it('does not match cookies whose name merely ends with the target', () => {
    document.cookie = 'xcsrftoken=wrong'
    expect(getCookie('csrftoken')).toBeNull()
  })

  it('decodes URI-encoded values', () => {
    document.cookie = 'csrftoken=a%3Db'
    expect(getCookie('csrftoken')).toBe('a=b')
  })
})

describe('csrfHeader', () => {
  afterEach(clearCookies)

  it('returns the X-CSRFToken header when the cookie is set', () => {
    document.cookie = 'csrftoken=tok'
    expect(csrfHeader()).toEqual({ 'X-CSRFToken': 'tok' })
  })

  it('returns an empty object when no csrftoken cookie exists', () => {
    expect(csrfHeader()).toEqual({})
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/csrf.test.ts`
Expected: FAIL — module `./csrf` not found.

- [ ] **Step 3: Implement `frontend/src/lib/csrf.ts`**

```ts
export function getCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1))
    }
  }
  return null
}

export function csrfHeader(): Record<string, string> {
  const token = getCookie('csrftoken')
  return token === null ? {} : { 'X-CSRFToken': token }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/csrf.test.ts`
Expected: all PASS.

---

### Task 3: `lib/auth.ts` — typed auth client + `parseAllauthErrors` (TDD)

**Files:**
- Create: `frontend/src/lib/auth.ts`
- Test: `frontend/src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `csrfHeader()` from Task 2.
- Produces:
  - `interface Me { id: number; email: string; profile: { display_name: string } }`
  - `interface ParsedErrors { fieldErrors: Record<string, string>; formError?: string }`
  - `type AuthResult = { kind: 'success' } | { kind: 'pending' } | ({ kind: 'error' } & ParsedErrors)`
  - `parseAllauthErrors(body: unknown): ParsedErrors`
  - `signup(email: string, password: string): Promise<AuthResult>`
  - `login(email: string, password: string): Promise<AuthResult>`
  - `logout(): Promise<void>`
  - `getMe(): Promise<Me | null>` (401 → `null`)
  - `googleLoginUrl` constant + `startGoogleLogin(): void` (builds a form, POSTs it with browser navigation).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/lib/auth.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getMe,
  googleLoginUrl,
  login,
  logout,
  parseAllauthErrors,
  signup,
  startGoogleLogin,
} from './auth'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

afterEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

describe('parseAllauthErrors', () => {
  it('maps param errors to fieldErrors', () => {
    const parsed = parseAllauthErrors({
      status: 400,
      errors: [{ message: 'Enter a valid email.', code: 'invalid', param: 'email' }],
    })
    expect(parsed.fieldErrors).toEqual({ email: 'Enter a valid email.' })
    expect(parsed.formError).toBeUndefined()
  })

  it('maps errors without a param to formError', () => {
    const parsed = parseAllauthErrors({
      status: 400,
      errors: [{ message: 'Invalid credentials.', code: 'invalid' }],
    })
    expect(parsed.fieldErrors).toEqual({})
    expect(parsed.formError).toBe('Invalid credentials.')
  })

  it('keeps the first error per field', () => {
    const parsed = parseAllauthErrors({
      status: 400,
      errors: [
        { message: 'Too short.', code: 'short', param: 'password' },
        { message: 'Too common.', code: 'common', param: 'password' },
      ],
    })
    expect(parsed.fieldErrors).toEqual({ password: 'Too short.' })
  })

  it('falls back to a generic formError for malformed bodies', () => {
    const parsed = parseAllauthErrors({ nope: true })
    expect(parsed.fieldErrors).toEqual({})
    expect(parsed.formError).toBe('Something went wrong. Please try again.')
  })

  it('falls back to a generic formError for non-object bodies', () => {
    const parsed = parseAllauthErrors(null)
    expect(parsed.formError).toBe('Something went wrong. Please try again.')
  })

  it('skips malformed entries in the errors array', () => {
    const parsed = parseAllauthErrors({
      status: 400,
      errors: ['garbage', { message: 'Bad email.', code: 'invalid', param: 'email' }],
    })
    expect(parsed.fieldErrors).toEqual({ email: 'Bad email.' })
  })

  it('reports a generic formError when the errors array is empty', () => {
    const parsed = parseAllauthErrors({ status: 400, errors: [] })
    expect(parsed.formError).toBe('Something went wrong. Please try again.')
  })
})

describe('signup', () => {
  it('POSTs credentials with the CSRF header and reports success', async () => {
    document.cookie = 'csrftoken=tok'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(signup('a@b.co', 'pw12345678')).resolves.toEqual({ kind: 'success' })

    expect(fetchMock).toHaveBeenCalledWith('/_allauth/browser/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'tok' },
      body: JSON.stringify({ email: 'a@b.co', password: 'pw12345678' }),
    })
  })

  it('reports pending when allauth answers 401 with flows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ status: 401, data: { flows: [{ id: 'verify_email', is_pending: true }] } }, 401),
      ),
    )
    await expect(signup('a@b.co', 'pw')).resolves.toEqual({ kind: 'pending' })
  })

  it('parses 400 validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { status: 400, errors: [{ message: 'Too short.', code: 'short', param: 'password' }] },
          400,
        ),
      ),
    )
    await expect(signup('a@b.co', 'x')).resolves.toEqual({
      kind: 'error',
      fieldErrors: { password: 'Too short.' },
      formError: undefined,
    })
  })
})

describe('login', () => {
  it('POSTs to the login endpoint and reports success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(login('a@b.co', 'pw')).resolves.toEqual({ kind: 'success' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/_allauth/browser/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('parses 400 credential errors as a form error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { status: 400, errors: [{ message: 'Invalid credentials.', code: 'invalid' }] },
          400,
        ),
      ),
    )
    await expect(login('a@b.co', 'bad')).resolves.toEqual({
      kind: 'error',
      fieldErrors: {},
      formError: 'Invalid credentials.',
    })
  })
})

describe('logout', () => {
  it('DELETEs the session with the CSRF header and treats 401 as success', async () => {
    document.cookie = 'csrftoken=tok'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 401 }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(logout()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/_allauth/browser/v1/auth/session', {
      method: 'DELETE',
      headers: { 'X-CSRFToken': 'tok' },
    })
  })
})

describe('getMe', () => {
  it('returns the user on 200', async () => {
    const me = { id: 1, email: 'a@b.co', profile: { display_name: 'Ana' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(me)))
    await expect(getMe()).resolves.toEqual(me)
    expect(fetch).toHaveBeenCalledWith('/api/me/')
  })

  it('returns null on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'Not authenticated' }, 401)),
    )
    await expect(getMe()).resolves.toBeNull()
  })

  it('throws on unexpected statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    await expect(getMe()).rejects.toThrow('Request to /api/me/ failed with status 500')
  })
})

describe('startGoogleLogin', () => {
  it('submits a form POST to the provider redirect endpoint', () => {
    document.cookie = 'csrftoken=tok'
    const submit = vi.fn()
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submit)

    startGoogleLogin()

    expect(submit).toHaveBeenCalledTimes(1)
    const form = document.querySelector<HTMLFormElement>(`form[action="${googleLoginUrl}"]`)
    expect(form).not.toBeNull()
    expect(form?.method).toBe('post')
    const fields = new Map(
      Array.from(form?.querySelectorAll('input') ?? []).map((i) => [i.name, i.value]),
    )
    expect(fields.get('provider')).toBe('google')
    expect(fields.get('callback_url')).toBe('/')
    expect(fields.get('process')).toBe('login')
    expect(fields.get('csrfmiddlewaretoken')).toBe('tok')
    form?.remove()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/auth.test.ts`
Expected: FAIL — module `./auth` not found.

- [ ] **Step 3: Implement `frontend/src/lib/auth.ts`**

```ts
import { csrfHeader, getCookie } from './csrf'

const ALLAUTH_BASE = '/_allauth/browser/v1'
const ME_URL = '/api/me/'
const GENERIC_ERROR = 'Something went wrong. Please try again.'

export const googleLoginUrl = `${ALLAUTH_BASE}/auth/provider/redirect`

export interface Me {
  id: number
  email: string
  profile: { display_name: string }
}

export interface ParsedErrors {
  fieldErrors: Record<string, string>
  formError?: string
}

export type AuthResult = { kind: 'success' } | { kind: 'pending' } | ({ kind: 'error' } & ParsedErrors)

interface AllauthError {
  message: string
  param?: string
}

function isAllauthError(value: unknown): value is AllauthError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string'
  )
}

export function parseAllauthErrors(body: unknown): ParsedErrors {
  const fieldErrors: Record<string, string> = {}
  let formError: string | undefined

  const errors =
    typeof body === 'object' && body !== null && Array.isArray((body as { errors?: unknown }).errors)
      ? ((body as { errors: unknown[] }).errors satisfies unknown[])
      : []

  for (const entry of errors) {
    if (!isAllauthError(entry)) {
      continue
    }
    if (typeof entry.param === 'string') {
      fieldErrors[entry.param] ??= entry.message
    } else {
      formError ??= entry.message
    }
  }

  if (Object.keys(fieldErrors).length === 0 && formError === undefined) {
    formError = GENERIC_ERROR
  }
  return { fieldErrors, formError }
}

async function submitCredentials(
  endpoint: 'login' | 'signup',
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await fetch(`${ALLAUTH_BASE}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ email, password }),
  })
  if (response.ok) {
    return { kind: 'success' }
  }
  if (response.status === 401) {
    return { kind: 'pending' }
  }
  const parsed = parseAllauthErrors(await response.json().catch(() => null))
  return { kind: 'error', ...parsed }
}

export function signup(email: string, password: string): Promise<AuthResult> {
  return submitCredentials('signup', email, password)
}

export function login(email: string, password: string): Promise<AuthResult> {
  return submitCredentials('login', email, password)
}

export async function logout(): Promise<void> {
  await fetch(`${ALLAUTH_BASE}/auth/session`, {
    method: 'DELETE',
    headers: csrfHeader(),
  })
}

export async function getMe(): Promise<Me | null> {
  const response = await fetch(ME_URL)
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Request to ${ME_URL} failed with status ${String(response.status)}`)
  }
  return response.json() as Promise<Me>
}

export function startGoogleLogin(): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = googleLoginUrl
  const fields: Record<string, string> = {
    provider: 'google',
    callback_url: '/',
    process: 'login',
    csrfmiddlewaretoken: getCookie('csrftoken') ?? '',
  }
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}
```

Note: if `satisfies unknown[]` reads awkwardly or trips lint, a plain narrowing helper is fine — the behavior contract is what the tests pin down. Keep `parseAllauthErrors` a pure exported function.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/auth.test.ts`
Expected: all PASS.

- [ ] **Step 5: Lint the new files**

Run: `pnpm run lint`
Expected: zero warnings. Fix any strict-type-checked complaints (e.g. unnecessary assertions) before moving on.

---

### Task 4: UI primitives — `Button`, `TextField`, `FormError` (TDD)

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/TextField.tsx`, `frontend/src/components/ui/FormError.tsx`
- Test: `frontend/src/components/ui/Button.test.tsx`, `frontend/src/components/ui/TextField.test.tsx`, `frontend/src/components/ui/FormError.test.tsx`

**Interfaces:**
- Produces:
  - `Button({ variant?: 'primary' | 'secondary', type?: 'button' | 'submit', disabled?, loading?, onClick?, children })`
  - `TextField({ label, name, type?, value, onChange: (value: string) => void, error? })`
  - `FormError({ message?: string })` — renders nothing when `message` is undefined.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('renders a primary button by default', () => {
    render(<Button>save</Button>)
    const button = screen.getByRole('button', { name: 'save' })
    expect(button).toHaveClass('btn', 'btn-primary')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('supports the secondary variant and submit type', () => {
    render(
      <Button variant="secondary" type="submit">
        go
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'go' })
    expect(button).toHaveClass('btn-secondary')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>hit</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'hit' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled and shows an ellipsis while loading', () => {
    render(<Button loading>save</Button>)
    const button = screen.getByRole('button', { name: 'save…' })
    expect(button).toBeDisabled()
  })

  it('is disabled when disabled is set', () => {
    render(<Button disabled>save</Button>)
    expect(screen.getByRole('button', { name: 'save' })).toBeDisabled()
  })
})
```

NOTE: `@testing-library/user-event` may not be installed. Check `frontend/package.json`; if absent, use `fireEvent.click` from `@testing-library/react` instead (no new dependencies without need — `fireEvent` is sufficient for these tests):

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
// ...
    fireEvent.click(screen.getByRole('button', { name: 'hit' }))
    expect(onClick).toHaveBeenCalledTimes(1)
```

Create `frontend/src/components/ui/TextField.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TextField } from './TextField'

describe('TextField', () => {
  it('renders a labelled input bound to value', () => {
    render(<TextField label="Email" name="email" value="a@b.co" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveValue('a@b.co')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('supports a custom input type', () => {
    render(<TextField label="Password" name="password" type="password" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('reports changes with the new value', () => {
    const onChange = vi.fn()
    render(<TextField label="Email" name="email" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'x@y.z' } })
    expect(onChange).toHaveBeenCalledWith('x@y.z')
  })

  it('shows an inline error and links it to the input', () => {
    render(<TextField label="Email" name="email" value="" onChange={vi.fn()} error="Invalid." />)
    const input = screen.getByLabelText('Email')
    expect(screen.getByText('Invalid.')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Invalid.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders no error element when error is absent', () => {
    render(<TextField label="Email" name="email" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })
})
```

Create `frontend/src/components/ui/FormError.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FormError } from './FormError'

describe('FormError', () => {
  it('renders the message in an alert', () => {
    render(<FormError message="Bad credentials." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Bad credentials.')
  })

  it('renders nothing without a message', () => {
    const { container } = render(<FormError />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/ui`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the components**

Create `frontend/src/components/ui/Button.tsx`:

```tsx
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {children}
      {loading ? '…' : null}
    </button>
  )
}
```

Create `frontend/src/components/ui/TextField.tsx`:

```tsx
interface TextFieldProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function TextField({ label, name, type = 'text', value, onChange, error }: TextFieldProps) {
  const inputId = `field-${name}`
  const errorId = `${inputId}-error`
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        className="field-input"
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
      />
      {error === undefined ? null : (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
```

Create `frontend/src/components/ui/FormError.tsx`:

```tsx
export function FormError({ message }: { message?: string }) {
  if (message === undefined) {
    return null
  }
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/ui`
Expected: all PASS.

- [ ] **Step 5: Lint**

Run: `pnpm run lint`
Expected: zero warnings.

---

### Task 5: `AuthCard` layout component (TDD)

**Files:**
- Create: `frontend/src/components/AuthCard.tsx`
- Test: `frontend/src/components/AuthCard.test.tsx`

**Interfaces:**
- Produces: `AuthCard({ title: string, children: ReactNode })` — centered pastel card with an `<h1>` title.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/AuthCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthCard } from './AuthCard'

describe('AuthCard', () => {
  it('renders the title as a heading and its children', () => {
    render(
      <AuthCard title="login">
        <p>form goes here</p>
      </AuthCard>,
    )
    expect(screen.getByRole('heading', { name: 'login' })).toBeInTheDocument()
    expect(screen.getByText('form goes here')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/AuthCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `frontend/src/components/AuthCard.tsx`**

```tsx
import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-card">
      <h1 className="auth-card-title">{title}</h1>
      {children}
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/AuthCard.test.tsx`
Expected: PASS.

---

### Task 6: `useMe` hook (TDD)

**Files:**
- Create: `frontend/src/hooks/useMe.ts`
- Test: `frontend/src/hooks/useMe.test.tsx`

**Interfaces:**
- Consumes: `getMe`, `Me` from Task 3.
- Produces: `meQueryOptions` (`{ queryKey: ['me'], queryFn: getMe }` via `queryOptions()`), `useMe()` returning `UseQueryResult<Me | null>`. The router guard (Task 8) uses `meQueryOptions` with `queryClient.ensureQueryData`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/useMe.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { meQueryOptions, useMe } from './useMe'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMe', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the ["me"] query key', () => {
    expect(meQueryOptions.queryKey).toEqual(['me'])
  })

  it('returns the user when authenticated', async () => {
    const me = { id: 1, email: 'a@b.co', profile: { display_name: 'Ana' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(me))))
    const { result } = renderHook(() => useMe(), { wrapper })
    await waitFor(() => {
      expect(result.current.data).toEqual(me)
    })
  })

  it('returns null data (not an error) on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ detail: 'nope' }), { status: 401 })),
    )
    const { result } = renderHook(() => useMe(), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/hooks/useMe.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `frontend/src/hooks/useMe.ts`**

```ts
import { queryOptions, useQuery } from '@tanstack/react-query'

import { getMe } from '../lib/auth'

export const meQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: getMe,
})

export function useMe() {
  return useQuery(meQueryOptions)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/hooks/useMe.test.tsx`
Expected: PASS.

---

### Task 7: Login and signup pages (TDD)

**Files:**
- Create: `frontend/src/routes/login.tsx`, `frontend/src/routes/signup.tsx`
- Test: `frontend/src/routes/login.test.tsx`, `frontend/src/routes/signup.test.tsx`

**Interfaces:**
- Consumes: `login`, `signup`, `startGoogleLogin`, `AuthResult` (Task 3); `Button`, `TextField`, `FormError` (Task 4); `AuthCard` (Task 5); `meQueryOptions` (Task 6).
- Produces: `LoginPage`, `SignupPage` components, plus a shared `AuthForm` component (in `frontend/src/components/AuthForm.tsx`) that owns the email/password state, submit handling, error mapping, Google button and cross-link — this shared form is what keeps jscpd quiet.

Design note: the two pages differ only in title, submit label, action function, success behavior (login/signup navigate to `/`; signup may show a "check your email" info state) and the alternate link. Extract ALL shared structure into `AuthForm`; the route files stay tiny.

- [ ] **Step 1: Write the failing tests**

The pages use `useNavigate`/`useQueryClient`, so tests render them inside a real router + query client. Create `frontend/src/routes/login.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from './login'

function renderLogin() {
  const rootRoute = createRootRoute({ component: Outlet })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginPage,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>home page</p>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, loginRoute]),
    history: undefined,
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  void router.navigate({ to: '/login' })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { queryClient }
}

async function submitCredentials() {
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'a@b.co' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw12345678' } })
  fireEvent.click(screen.getByRole('button', { name: 'log in' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('logs in and navigates home on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient } = renderLogin()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await submitCredentials()

    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] })
    expect(fetchMock).toHaveBeenCalledWith(
      '/_allauth/browser/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.co', password: 'pw12345678' }),
      }),
    )
  })

  it('shows a field error next to the input', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 400,
            errors: [{ message: 'Enter a valid email.', code: 'invalid', param: 'email' }],
          }),
          { status: 400 },
        ),
      ),
    )
    renderLogin()

    await submitCredentials()

    expect(await screen.findByText('Enter a valid email.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email.')
  })

  it('shows a form-level error banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 400,
            errors: [{ message: 'Invalid credentials.', code: 'invalid' }],
          }),
          { status: 400 },
        ),
      ),
    )
    renderLogin()

    await submitCredentials()

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.')
  })

  it('starts the Google flow from the secondary button', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {
      /* jsdom cannot navigate */
    })
    renderLogin()

    fireEvent.click(await screen.findByRole('button', { name: 'continue with Google' }))

    await waitFor(() => {
      expect(submit).toHaveBeenCalledTimes(1)
    })
  })
})
```

Create `frontend/src/routes/signup.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SignupPage } from './signup'

function renderSignup() {
  const rootRoute = createRootRoute({ component: Outlet })
  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    component: SignupPage,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>home page</p>,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([homeRoute, signupRoute]) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  void router.navigate({ to: '/signup' })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function submitCredentials() {
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'a@b.co' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw12345678' } })
  fireEvent.click(screen.getByRole('button', { name: 'sign up' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SignupPage', () => {
  it('signs up and navigates home on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    renderSignup()

    await submitCredentials()

    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/_allauth/browser/v1/auth/signup',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows the check-your-email state on a pending 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ status: 401, data: { flows: [{ id: 'verify_email' }] } }),
          { status: 401 },
        ),
      ),
    )
    renderSignup()

    await submitCredentials()

    expect(
      await screen.findByText('Check your email to confirm your account.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
  })

  it('shows field errors from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 400,
            errors: [{ message: 'Password is too short.', code: 'short', param: 'password' }],
          }),
          { status: 400 },
        ),
      ),
    )
    renderSignup()

    await submitCredentials()

    expect(await screen.findByText('Password is too short.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/routes/login.test.tsx src/routes/signup.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the shared `AuthForm` and both pages**

Create `frontend/src/components/AuthForm.tsx`:

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { startGoogleLogin, type AuthResult, type ParsedErrors } from '../lib/auth'
import { AuthCard } from './AuthCard'
import { Button } from './Button'      // adjust: './ui/Button'
import { FormError } from './ui/FormError'
import { TextField } from './ui/TextField'

interface AuthFormProps {
  title: string
  submitLabel: string
  action: (email: string, password: string) => Promise<AuthResult>
  pendingMessage?: string
  alternate: { prompt: string; linkLabel: string; to: '/login' | '/signup' }
}

const NO_ERRORS: ParsedErrors = { fieldErrors: {} }

export function AuthForm({ title, submitLabel, action, pendingMessage, alternate }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<ParsedErrors>(NO_ERRORS)
  const [pending, setPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors(NO_ERRORS)
    setPending(false)
    void action(email, password)
      .then(async (result) => {
        if (result.kind === 'success') {
          await queryClient.invalidateQueries({ queryKey: ['me'] })
          await navigate({ to: '/' })
        } else if (result.kind === 'pending') {
          setPending(true)
        } else {
          setErrors(result)
        }
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <AuthCard title={title}>
      {pending ? <p className="form-info">{pendingMessage}</p> : null}
      <FormError message={errors.formError} />
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.fieldErrors['email']}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.fieldErrors['password']}
        />
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </form>
      <p className="auth-alt">
        <Button variant="secondary" onClick={startGoogleLogin}>
          continue with Google
        </Button>
      </p>
      <p className="auth-alt">
        {alternate.prompt} <Link to={alternate.to}>{alternate.linkLabel}</Link>
      </p>
    </AuthCard>
  )
}
```

(Fix the import path typo: `Button` lives at `./ui/Button`.)

Create `frontend/src/routes/login.tsx`:

```tsx
import { AuthForm } from '../components/AuthForm'
import { login } from '../lib/auth'

export function LoginPage() {
  return (
    <AuthForm
      title="login"
      submitLabel="log in"
      action={login}
      alternate={{ prompt: 'new around here?', linkLabel: 'sign up', to: '/signup' }}
    />
  )
}
```

Create `frontend/src/routes/signup.tsx`:

```tsx
import { AuthForm } from '../components/AuthForm'
import { signup } from '../lib/auth'

export function SignupPage() {
  return (
    <AuthForm
      title="sign up"
      submitLabel="sign up"
      action={signup}
      pendingMessage="Check your email to confirm your account."
      alternate={{ prompt: 'already a member?', linkLabel: 'log in', to: '/login' }}
    />
  )
}
```

Note on `<Link to>`: at this point the app router (Task 8) may not yet declare `/signup`; TanStack Router's `Register` interface makes `to` type-checked against the app router. If `tsc` complains before Task 8 lands, it resolves once Task 8 adds the routes — run the full `tsc -b` after Task 8. Tests use local routers so runtime is fine.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/routes/login.test.tsx src/routes/signup.test.tsx`
Expected: all PASS. (If navigation assertions flake, wrap in `waitFor`.)

- [ ] **Step 5: Lint + format**

Run: `pnpm run lint && pnpm run format:check`
Expected: clean. Note `sonarjs/no-duplicate-string` applies to non-test files — the `AuthForm` extraction avoids string/structure duplication between the two pages.

---

### Task 8: Router guards + home page logout (TDD)

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/routes/home.tsx`
- Modify: `frontend/src/routes/home.test.tsx`
- Modify: `frontend/src/router.test.tsx`

**Interfaces:**
- Consumes: `LoginPage`, `SignupPage` (Task 7); `meQueryOptions` (Task 6); `logout` (Task 3); `Button` (Task 4).
- Produces: `createAppRouter(queryClient: QueryClient)` exported from `router.tsx`; router context `{ queryClient: QueryClient }`. Guards: home `beforeLoad` redirects to `/login` when `me` is null; login/signup `beforeLoad` redirect to `/` when `me` is non-null.

- [ ] **Step 1: Rewrite `frontend/src/router.tsx` with context + guards**

```tsx
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { meQueryOptions } from './hooks/useMe'
import { HomePage } from './routes/home'
import { LoginPage } from './routes/login'
import { SignupPage } from './routes/signup'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQueryOptions)
    if (me === null) {
      throw redirect({ to: '/login' })
    }
  },
  component: HomePage,
})

const anonymousOnly = async ({ context }: { context: RouterContext }) => {
  const me = await context.queryClient.ensureQueryData(meQueryOptions)
  if (me !== null) {
    throw redirect({ to: '/' })
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: anonymousOnly,
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: anonymousOnly,
  component: SignupPage,
})

const routeTree = rootRoute.addChildren([homeRoute, loginRoute, signupRoute])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient } })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
```

- [ ] **Step 2: Update `frontend/src/main.tsx`**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import { createAppRouter } from './router'

const queryClient = new QueryClient()
const router = createAppRouter(queryClient)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 3: Update `frontend/src/routes/home.tsx` with welcome + logout**

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '../components/ui/Button'
import { useMe } from '../hooks/useMe'
import { logout } from '../lib/auth'
import { fetchHealth, isHealthy } from '../lib/health'

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  let status = 'checking…'
  if (!isLoading && data) {
    status = isHealthy(data) ? 'online' : 'offline'
  }

  const handleLogout = () => {
    void logout().then(async () => {
      queryClient.clear()
      await navigate({ to: '/login' })
    })
  }

  const greeting = me ? (me.profile.display_name || me.email) : ''

  return (
    <main>
      <header className="home-header">
        <p>welcome, {greeting}</p>
        <Button variant="secondary" onClick={handleLogout}>
          log out
        </Button>
      </header>
      <h1>oktclone</h1>
      <p>
        API status: <span data-testid="api-status">{status}</span>
      </p>
    </main>
  )
}
```

- [ ] **Step 4: Rewrite the tests**

Replace `frontend/src/routes/home.test.tsx` (HomePage now also fetches `/api/me/`, calls logout, navigates — render it inside a router):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from './home'

const ME = { id: 1, email: 'ana@b.co', profile: { display_name: 'Ana' } }

function stubFetch({
  health = { status: 'ok' },
  me = ME as typeof ME | null,
}: { health?: { status: string }; me?: typeof ME | null } = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/me/') {
      return Promise.resolve(
        me === null
          ? new Response(JSON.stringify({ detail: 'nope' }), { status: 401 })
          : new Response(JSON.stringify(me)),
      )
    }
    if (init?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 401 }))
    }
    return Promise.resolve(new Response(JSON.stringify(health)))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderHome() {
  const rootRoute = createRootRoute({ component: Outlet })
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <p>login page</p>,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([homeRoute, loginRoute]) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { queryClient }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('shows online when the API reports ok', async () => {
    stubFetch()
    renderHome()
    expect(await screen.findByText('online')).toBeInTheDocument()
  })

  it('shows offline when the API reports a bad status', async () => {
    stubFetch({ health: { status: 'down' } })
    renderHome()
    expect(await screen.findByText('offline')).toBeInTheDocument()
  })

  it('greets the user by display name', async () => {
    stubFetch()
    renderHome()
    expect(await screen.findByText('welcome, Ana')).toBeInTheDocument()
  })

  it('falls back to the email when display name is empty', async () => {
    stubFetch({ me: { ...ME, profile: { display_name: '' } } })
    renderHome()
    expect(await screen.findByText('welcome, ana@b.co')).toBeInTheDocument()
  })

  it('logs out, clears the cache and navigates to /login', async () => {
    const fetchMock = stubFetch()
    const { queryClient } = renderHome()
    const clear = vi.spyOn(queryClient, 'clear')

    fireEvent.click(await screen.findByRole('button', { name: 'log out' }))

    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(clear).toHaveBeenCalled()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/_allauth/browser/v1/auth/session', {
        method: 'DELETE',
        headers: {},
      })
    })
  })
})
```

Replace `frontend/src/router.test.tsx` with guard tests against the real app router:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from './router'

const ME = { id: 1, email: 'ana@b.co', profile: { display_name: 'Ana' } }

function stubFetch(me: typeof ME | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/me/') {
        return Promise.resolve(
          me === null
            ? new Response(JSON.stringify({ detail: 'nope' }), { status: 401 })
            : new Response(JSON.stringify(me)),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ status: 'ok' })))
    }),
  )
}

async function renderAt(path: string, me: typeof ME | null) {
  stubFetch(me)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient)
  await router.navigate({ to: path })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('router guards', () => {
  it('redirects a logged-out visitor from / to /login', async () => {
    const router = await renderAt('/', null)
    expect(await screen.findByRole('heading', { name: 'login' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('renders home for a logged-in visitor', async () => {
    await renderAt('/', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
  })

  it('redirects a logged-in visitor from /login to /', async () => {
    const router = await renderAt('/login', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('redirects a logged-in visitor from /signup to /', async () => {
    const router = await renderAt('/signup', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
  })

  it('shows the signup page to a logged-out visitor', async () => {
    const router = await renderAt('/signup', null)
    expect(await screen.findByRole('heading', { name: 'sign up' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signup')
  })
})
```

Implementation note: `router.navigate` before `render` may need the router to have loaded; if the initial path assertions flake, create the router with `createAppRouter(queryClient)` and use `createMemoryHistory({ initialEntries: [path] })` passed through `createRouter` options instead — in that case change `createAppRouter` to accept an optional `history` parameter:

```ts
import { createMemoryHistory, type RouterHistory } from '@tanstack/react-router'

export function createAppRouter(queryClient: QueryClient, history?: RouterHistory) {
  return createRouter({ routeTree, context: { queryClient }, history })
}
```

and in tests: `createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))`. Prefer this memory-history form — jsdom URL state leaks between tests otherwise.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm run test`
Expected: all PASS, coverage ≥ 80% on all four metrics.

- [ ] **Step 6: Full static gates**

Run: `pnpm run lint && pnpm run format:check && pnpm exec tsc -b`
Expected: all clean.

---

### Task 9: Quality gate sweep (mutation, duplication, final verification)

**Files:**
- Possibly modify: any file from Tasks 1-8 (test hardening only).

- [ ] **Step 1: Run all fast gates from `frontend/`**

```bash
pnpm run lint && pnpm run format:check && pnpm exec tsc -b && pnpm run test
```

Expected: all pass. Paste the coverage summary table for the final report.

- [ ] **Step 2: Run duplication check from repo root**

```bash
cd /Users/lucasventurella/code/oktclone && pnpm exec jscpd
```

Expected: below the 1% threshold. If login/signup or any pair of files trips it, extract the duplicated block into a shared component/helper (the `AuthForm` component exists precisely for this).

- [ ] **Step 3: Run mutation testing from `frontend/`**

```bash
cd /Users/lucasventurella/code/oktclone/frontend && pnpm run mutate
```

Expected: mutation score ≥ 60 (break threshold). Budget ~5-15 minutes runtime.

- [ ] **Step 4: If score < 60, kill surviving mutants in lib/ first**

Check `reports/mutation.html` (or clear-text output) for survivors. Priority targets — pure functions are cheap to pin down:
- `csrf.ts`: cookie-name boundary conditions (already covered by the `xcsrftoken` test), `slice` offset (covered by the `a%3Db` decode test).
- `auth.ts` `parseAllauthErrors`: first-error-wins (`??=`), empty-array fallback, malformed-entry skip — all covered above; add tests for any survivor Stryker reports (e.g. status-code comparisons in `submitCredentials`/`getMe` — the 401-vs-500 tests kill those).
- Route-wiring survivors (e.g. `beforeLoad` internals, CSS class strings) are acceptable if total ≥ 60.

- [ ] **Step 5: Confirm no stray changes outside frontend/ and no commits made**

```bash
cd /Users/lucasventurella/code/oktclone && git status --short && git log --oneline -1
```

Expected: modifications only under `frontend/` (plus this plan file), HEAD still at `bc66f3a`.

---

## Self-Review

**Spec coverage** (Frontend PR 1 section + task prompt deliverables):
- Routes /login, /signup — Task 7/8. ✓
- useMe() on /api/me with ['me'] key, 401→null — Tasks 3, 6. ✓
- beforeLoad guards both directions via ensureQueryData — Task 8. ✓
- allauth endpoints incl. Google form-POST redirect — Task 3. ✓
- Logout button in home header, clears cache, navigates — Task 8. ✓
- ui primitives + AuthCard + tests — Tasks 4, 5. ✓
- csrf helpers unit-tested — Task 2. ✓
- parseAllauthErrors plain exported function, unit-tested — Task 3. ✓
- Vite proxy /_allauth — Task 1. ✓
- All quality gates — Task 9. ✓

**Type consistency:** `AuthResult`/`ParsedErrors` defined in Task 3, consumed in Task 7; `meQueryOptions` defined Task 6, consumed Task 8; `createAppRouter(queryClient, history?)` consistent between Task 8 steps. ✓

**Known judgment calls (documented for the executor):**
- `useNavigate` inside `AuthForm`/`HomePage` requires a router in tests — all page tests render within a `RouterProvider`.
- No commits anywhere in this plan — the orchestrator commits (overrides the usual per-task commit steps).
