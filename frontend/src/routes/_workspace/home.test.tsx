import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/api/authStore'

const {
  getMock,
  postMock,
  deleteMock,
  putMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  putMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

function makeAccessToken(payload: Record<string, unknown> = {}) {
  return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }))}.signature`
}

vi.mock('@/api/axios', () => ({
  default: {
    get: getMock,
    post: postMock,
    delete: deleteMock,
    put: putMock,
  },
}))

vi.mock('@/hooks/useSilentTokenRefresh', () => ({
  useSilentTokenRefresh: () => undefined,
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('./components/sidebar', () => ({
  default: () => <div data-testid="workspace-sidebar" />,
}))

vi.mock('./components/navbar', () => ({
  default: () => <div data-testid="workspace-navbar" />,
}))

async function renderAppAt(pathname: string) {
  const { routeTree } = await import('../../routeTree.gen')

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [pathname] }),
    scrollRestoration: false,
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
  })

  return { router }
}

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: makeAccessToken({ sub: 'user-1' }),
      user: { id: 'user-1', email: 'user@test.com', profile: {} },
      isLoggingOut: false,
    })
    window.scrollTo = vi.fn()
  })

  it('renders empty state when there are no projects or invitations', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/projects?')) {
        return { data: [] }
      }

      if (url.startsWith('/project-members/me/invitations?')) {
        return { data: [] }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    await renderAppAt('/home')

    expect(await screen.findByText('Welcome to Taskademia!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create First Project/i })).toBeInTheDocument()
  })

  it('accepts and rejects invitations via action buttons', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/projects?')) {
        return { data: [] }
      }

      if (url.startsWith('/project-members/me/invitations?')) {
        return {
          data: [
            {
              _id: 'invite-1',
              projectId: { _id: 'p1', name: 'Invite Project' },
              joinedBy: { email: 'owner@test.com' },
            },
          ],
        }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    postMock.mockResolvedValue({ data: { message: 'Joined project!' } })
    deleteMock.mockResolvedValue({ data: { message: 'Invitation declined' } })

    const { router } = await renderAppAt('/home')
    const invalidateSpy = vi.spyOn(router, 'invalidate')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const user = userEvent.setup()

    expect(await screen.findByText('Invite Project')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/project-members/invite-1/accept')
      expect(invalidateSpy).toHaveBeenCalled()
      expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ replace: true }))
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project!')
    })

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/project-members/invite-1/reject')
      expect(toastSuccessMock).toHaveBeenCalledWith('Invitation declined')
    })
  })
})
