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
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('logs in, invalidates the me query and navigates home on success', async () => {
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
