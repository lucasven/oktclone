import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchHealth, isHealthy } from './health'

describe('isHealthy', () => {
  it('is true when status is ok', () => {
    expect(isHealthy({ status: 'ok' })).toBe(true)
  })

  it('is false for any other status', () => {
    expect(isHealthy({ status: 'degraded' })).toBe(false)
  })
})

describe('fetchHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the health endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }))),
    )
    await expect(fetchHealth()).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledWith('/api/health/')
  })
})
