import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
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
  me = ME,
}: { health?: { status: string }; me?: typeof ME | null } = {}) {
  const fetchMock = vi.fn((input: string | URL, init?: RequestInit) => {
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
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
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
