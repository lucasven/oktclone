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
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'nope' }), { status: 401 })),
    )
    const { result } = renderHook(() => useMe(), { wrapper })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })
})
