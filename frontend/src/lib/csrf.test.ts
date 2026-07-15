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
