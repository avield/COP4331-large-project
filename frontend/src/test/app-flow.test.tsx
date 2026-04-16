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

const { getMock, postMock, deleteMock, putMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  putMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

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

vi.mock('../routes/_workspace/components/sidebar', () => ({
  default: () => <div data-testid="workspace-sidebar" />,
}))

vi.mock('../routes/_workspace/components/navbar', () => ({
  default: () => <div data-testid="workspace-navbar" />,
}))

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }),
}))

vi.mock('../routes/_workspace/projects/components/column', () => ({
  KanbanColumn: () => <div data-testid="kanban-column" />,
}))

vi.mock('../routes/_workspace/projects/components/area-chart', () => ({
  ProjectProgressAreaChart: () => <div data-testid="progress-chart" />,
}))

vi.mock('../routes/_workspace/projects/components/goals-overview-chart', () => ({
  GoalsOverviewChart: () => <div data-testid="goals-chart" />,
}))

vi.mock('@/components/network-avatar', () => ({
  NetworkAvatar: () => <div data-testid="network-avatar" />,
}))

function makeAccessToken(payload: Record<string, unknown> = {}) {
  return `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }))}.signature`
}

async function renderAppAt(pathname: string) {
  const { routeTree } = await import('../routeTree.gen')

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

    await router.load()
  })

  return { router, queryClient }
}

describe('App flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: null,
      user: null,
      isLoggingOut: false,
    })
  })

  it('logs in through the auth route and lands on the home page', async () => {
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/refresh') {
        throw new Error('No refresh token')
      }

      if (url === '/auth/login') {
        return {
          data: {
            accessToken: makeAccessToken({ sub: 'user-1' }),
            user: {
              _id: 'user-1',
              email: 'user@test.com',
              profile: { displayName: 'User Test', profilePictureUrl: '' },
            },
          },
        }
      }

      throw new Error(`Unexpected POST ${url}`)
    })

    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/projects?')) {
        return {
          data: [
            {
              _id: 'project-1',
              name: 'Alpha Project',
              description: 'A loaded home project',
              visibility: 'public',
              status: 'active',
              memberCount: 3,
              taskCounts: { total: 2, todo: 1, in_progress: 1, blocked: 0, done: 0 },
            },
          ],
        }
      }

      if (url.startsWith('/project-members/me/invitations?')) {
        return { data: [] }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    const { router } = await renderAppAt('/login')
    const user = userEvent.setup()

    expect(await screen.findByText('Welcome back')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('user@example.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('********'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(await screen.findByText('Alpha Project')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
    expect(useAuthStore.getState().accessToken).not.toBeNull()
    expect(useAuthStore.getState().user?.id).toBe('user-1')
  })

  it('loads the real home route and accepts an invitation', async () => {
    useAuthStore.setState({
      accessToken: makeAccessToken({ sub: 'user-1' }),
      user: { id: 'user-1', email: 'user@test.com', profile: {} },
      isLoggingOut: false,
    })

    getMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/projects?')) {
        return { data: [] }
      }

      if (url.startsWith('/project-members/me/invitations?')) {
        return {
          data: [
            {
              _id: 'invite-1',
              projectId: { _id: 'project-1', name: 'Invite Project' },
              joinedBy: { email: 'owner@test.com' },
            },
          ],
        }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    postMock.mockImplementation(async (url: string) => {
      if (url === '/project-members/invite-1/accept') {
        return { data: { message: 'Joined project!' } }
      }

      throw new Error(`Unexpected POST ${url}`)
    })

    await renderAppAt('/home')
    const user = userEvent.setup()

    expect(await screen.findByText('Invite Project')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/project-members/invite-1/accept')
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project!')
    })
  })

  it('loads the project route and submits a join request from visitor view', async () => {
    useAuthStore.setState({
      accessToken: makeAccessToken({ sub: 'user-1' }),
      user: { id: 'user-1', email: 'user@test.com', profile: {} },
      isLoggingOut: false,
    })

    getMock.mockImplementation(async (url: string) => {
      if (url === '/projects/project-1/details') {
        return {
          data: {
            isFullDetails: false,
            project: {
              _id: 'project-1',
              name: 'Public Sprint Board',
              description: 'Public project description',
              visibility: 'public',
              recruitingStatus: 'open',
              lookingForRoles: ['Designer'],
              settings: {
                allowSelfJoinRequests: true,
                requireApprovalToJoin: false,
                inviteOnly: false,
              },
            },
            tasks: [],
            members: [],
            goals: [],
            permissions: { canJoinProject: true },
          },
        }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    postMock.mockImplementation(async (url: string) => {
      if (url === '/project-members/project/project-1/join') {
        return { data: { message: 'Joined' } }
      }

      throw new Error(`Unexpected POST ${url}`)
    })

    await renderAppAt('/projects/project-1')
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'Public Sprint Board' })).toBeInTheDocument()
    expect(screen.getByText('Open Access')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join Project' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/project-members/project/project-1/join')
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project successfully!')
    })
  })
})