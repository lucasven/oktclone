import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAppRouter } from './router'

const ME = { id: 1, email: 'ana@b.co', profile: { display_name: 'Ana' } }

function stubFetch(me: typeof ME | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
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

function renderAt(path: string, me: typeof ME | null) {
  stubFetch(me)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createAppRouter(queryClient, createMemoryHistory({ initialEntries: [path] }))
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
    const router = renderAt('/', null)
    expect(await screen.findByRole('heading', { name: 'login' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('renders home for a logged-in visitor', async () => {
    renderAt('/', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
  })

  it('redirects a logged-in visitor from /login to /', async () => {
    const router = renderAt('/login', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('redirects a logged-in visitor from /signup to /', async () => {
    renderAt('/signup', ME)
    expect(await screen.findByRole('heading', { name: 'oktclone' })).toBeInTheDocument()
  })

  it('shows the signup page to a logged-out visitor', async () => {
    const router = renderAt('/signup', null)
    expect(await screen.findByRole('heading', { name: 'sign up' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/signup')
  })
})
