import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/api/authStore'
import Login from './login'

const { navigateMock, postMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/api/axios', () => ({
  default: {
    post: postMock,
  },
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )

  return {
    ...actual,
    createFileRoute: () => () => ({}),
    useNavigate: () => navigateMock,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? '#'} {...props}>
        {children}
      </a>
    ),
  }
})

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <Login />
    </QueryClientProvider>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isLoggingOut: false,
    })
  })

  it('submits credentials, saves auth state, and navigates to /home on success', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: 'token-123',
        user: {
          _id: 'u1',
          email: 'user@test.com',
          profile: { displayName: 'User Test', profilePictureUrl: '' },
        },
      },
    })

    renderLogin()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('user@example.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('********'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'Passw0rd!',
      })
    })

    await waitFor(() => {
      expect(useAuthStore.getState().accessToken).toBe('token-123')
      expect(useAuthStore.getState().user?.id).toBe('u1')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/home' })
    })
  })

  it('shows backend verification error and resend link for unverified accounts', async () => {
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: { message: 'Please verify your email before logging in.' },
      },
      message: 'Request failed',
    })

    renderLogin()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('user@example.com'), 'newuser@test.com')
    await user.type(screen.getByPlaceholderText('********'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(
      await screen.findByText('Please verify your email before logging in.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Resend verification email' })).toBeInTheDocument()
  })
})
