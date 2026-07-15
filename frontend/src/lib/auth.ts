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

export type AuthResult =
  { kind: 'success' } | { kind: 'pending' } | ({ kind: 'error' } & ParsedErrors)

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

function errorList(body: unknown): unknown[] {
  if (typeof body !== 'object' || body === null) {
    return []
  }
  const errors = (body as { errors?: unknown }).errors
  return Array.isArray(errors) ? errors : []
}

export function parseAllauthErrors(body: unknown): ParsedErrors {
  const fieldErrors: Record<string, string> = {}
  let formError: string | undefined

  for (const entry of errorList(body)) {
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
  const body: unknown = await response.json().catch(() => null)
  return { kind: 'error', ...parseAllauthErrors(body) }
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
