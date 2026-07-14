import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiUrl, fetchJson } from './api'

describe('apiUrl', () => {
  it('prefixes paths with the API base', () => {
    expect(apiUrl('health/')).toBe('/api/health/')
  })

  it('normalizes leading slashes', () => {
    expect(apiUrl('/health/')).toBe('/api/health/')
  })
})

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }))),
    )
    await expect(fetchJson('health/')).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledWith('/api/health/')
  })

  it('throws with path and status on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    await expect(fetchJson('health/')).rejects.toThrow('Request to health/ failed with status 503')
  })
})
