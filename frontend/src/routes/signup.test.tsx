import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
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
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, signupRoute]),
    history: createMemoryHistory({ initialEntries: ['/signup'] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
        new Response(JSON.stringify({ status: 401, data: { flows: [{ id: 'verify_email' }] } }), {
          status: 401,
        }),
      ),
    )
    renderSignup()

    await submitCredentials()

    expect(await screen.findByText('Check your email to confirm your account.')).toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
  })

  it('never shows the pending message before or after a failed submit', async () => {
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

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByText('Check your email to confirm your account.')).not.toBeInTheDocument()

    await submitCredentials()

    expect(await screen.findByText('Password is too short.')).toBeInTheDocument()
    expect(screen.queryByText('Check your email to confirm your account.')).not.toBeInTheDocument()
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
