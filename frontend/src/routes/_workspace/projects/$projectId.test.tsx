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

vi.mock('../components/sidebar', () => ({
  default: () => <div data-testid="workspace-sidebar" />,
}))

vi.mock('../components/navbar', () => ({
  default: () => <div data-testid="workspace-navbar" />,
}))

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }),
}))

vi.mock('./components/column', () => ({
  KanbanColumn: () => <div data-testid="kanban-column" />,
}))

vi.mock('./components/goals-overview-chart', () => ({
  GoalsOverviewChart: () => <div data-testid="goals-chart" />,
}))

vi.mock('./components/area-chart', () => ({
  ProjectProgressAreaChart: () => <div data-testid="progress-chart" />,
}))

vi.mock('@/components/network-avatar', () => ({
  NetworkAvatar: () => <div data-testid="network-avatar" />,
}))

async function renderAppAt(pathname: string) {
  const { routeTree } = await import('../../../routeTree.gen')

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

describe('Project details page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: makeAccessToken({ sub: 'user-1' }),
      user: { id: 'user-1', email: 'user@test.com', profile: {} },
      isLoggingOut: false,
    })
    window.scrollTo = vi.fn()
  })

  it('renders visitor view and allows join request actions', async () => {
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

    postMock.mockResolvedValue({ data: { message: 'Joined project successfully!' } })

    const { router } = await renderAppAt('/projects/project-1')
    const invalidateSpy = vi.spyOn(router, 'invalidate')
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { name: 'Public Sprint Board' })).toBeInTheDocument()
    expect(screen.getByText('Open Access')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join Project' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/project-members/project/project-1/join')
      expect(invalidateSpy).toHaveBeenCalled()
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project successfully!')
    })
  }, 15000)

  it('renders member view controls when full details are available', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/projects/project-1/details') {
        return {
          data: {
            isFullDetails: true,
            project: {
              _id: 'project-1',
              name: 'Internal Planning Board',
              description: 'Internal project description',
              visibility: 'private',
              recruitingStatus: 'closed',
              status: 'active',
              tags: ['frontend'],
              settings: {
                allowSelfJoinRequests: false,
                requireApprovalToJoin: false,
                inviteOnly: true,
              },
            },
            tasks: [],
            goals: [],
            permissions: { canJoinProject: false },
            members: [
              {
                _id: 'member-1',
                projectId: 'project-1',
                role: 'Owner',
                membershipStatus: 'active',
                userId: {
                  _id: 'user-1',
                  email: 'owner@test.com',
                  profile: { displayName: 'Owner User' },
                },
                permissions: {
                  canEditProject: true,
                  canManageMembers: true,
                  canCreateTasks: true,
                  canAssignTasks: true,
                  canCompleteAnyTask: true,
                  canModerateChat: true,
                },
              },
            ],
          },
        }
      }

      throw new Error(`Unexpected GET ${url}`)
    })

    await renderAppAt('/projects/project-1')

    expect(await screen.findByRole('heading', { name: 'Internal Planning Board' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument()
    expect(screen.getAllByText('Private').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Join Project' })).not.toBeInTheDocument()
  })
})
