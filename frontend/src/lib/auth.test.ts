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

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

  it('collects errors for several fields at once', () => {
    const parsed = parseAllauthErrors({
      status: 400,
      errors: [
        { message: 'Bad email.', code: 'invalid', param: 'email' },
        { message: 'Too short.', code: 'short', param: 'password' },
      ],
    })
    expect(parsed.fieldErrors).toEqual({ email: 'Bad email.', password: 'Too short.' })
    expect(parsed.formError).toBeUndefined()
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
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { status: 401, data: { flows: [{ id: 'verify_email', is_pending: true }] } },
            401,
          ),
        ),
    )
    await expect(signup('a@b.co', 'pw')).resolves.toEqual({ kind: 'pending' })
  })

  it('parses 400 validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
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

  it('reports a generic error when the failure body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(signup('a@b.co', 'x')).resolves.toEqual({
      kind: 'error',
      fieldErrors: {},
      formError: 'Something went wrong. Please try again.',
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
      vi
        .fn()
        .mockResolvedValue(
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
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {
      /* jsdom cannot navigate */
    })

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
