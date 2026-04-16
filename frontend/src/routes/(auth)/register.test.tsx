import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Register from './register'

const { postMock } = vi.hoisted(() => ({
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
    Link: ({ children, to, ...props }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? '#'} {...props}>
        {children}
      </a>
    ),
  }
})

function renderRegister() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <Register />
    </QueryClientProvider>
  )
}

describe('Register page', () => {
  it('keeps submit disabled until password is valid and confirmed', async () => {
    renderRegister()
    const user = userEvent.setup()
    const passwordInputs = screen.getAllByPlaceholderText('********')
    const passwordInput = passwordInputs[0]
    const confirmPasswordInput = passwordInputs[1]

    const createButton = screen.getByRole('button', { name: 'Create Account' })
    expect(createButton).toBeDisabled()

    await user.type(passwordInput, 'short')
    await user.type(confirmPasswordInput, 'short')
    expect(createButton).toBeDisabled()

    await user.clear(passwordInput)
    await user.type(passwordInput, 'ValidPass1!')
    await user.clear(confirmPasswordInput)
    await user.type(confirmPasswordInput, 'ValidPass1!')

    expect(await screen.findByText('Passwords match')).toBeInTheDocument()
    expect(createButton).toBeEnabled()
  })

  it('submits registration and shows backend success message', async () => {
    postMock.mockResolvedValueOnce({
      data: { message: 'Registration successful. Verify your email.' },
    })

    renderRegister()
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText('John Doe'), 'Test User')
    await user.type(screen.getByPlaceholderText('user@example.com'), 'new@test.com')

    const passwordInputs = screen.getAllByPlaceholderText('********')
    await user.type(passwordInputs[0], 'ValidPass1!')
    await user.type(passwordInputs[1], 'ValidPass1!')

    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/auth/register', {
        email: 'new@test.com',
        password: 'ValidPass1!',
        displayName: 'Test User',
      })
    })

    expect(
      await screen.findByText('Registration successful. Verify your email.')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Need a new verification email?' })).toBeInTheDocument()
  })
})
