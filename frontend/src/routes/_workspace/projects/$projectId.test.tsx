import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  loaderDataMock,
  routerInvalidateMock,
  apiPostMock,
  toastSuccessMock,
  authState,
} = vi.hoisted(() => ({
  loaderDataMock: vi.fn(),
  routerInvalidateMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  authState: { user: { id: 'user-1' as string | undefined } },
}))

vi.mock('@/api/axios', () => ({
  default: {
    post: apiPostMock,
    delete: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
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

vi.mock('@/api/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id?: string } | null }) => unknown) =>
    selector(authState),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )

  return {
    ...actual,
    useRouter: () => ({
      invalidate: routerInvalidateMock,
      navigate: vi.fn(),
    }),
    useNavigate: () => vi.fn(),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? '#'} {...props}>
        {children}
      </a>
    ),
  }
})

describe.skip('Project details page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    routerInvalidateMock.mockResolvedValue(undefined)
    apiPostMock.mockResolvedValue(undefined)
    authState.user = { id: 'user-1' }
  })

  async function renderProjectPage() {
    const mod = await import('./$projectId')
    ;(mod.Route as any).useLoaderData = loaderDataMock
    const ProjectPage = (mod.Route as any).options?.component
    return render(<ProjectPage />)
  }

  it('renders visitor view and allows join request actions', async () => {
    loaderDataMock.mockReturnValue({
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
    })

    await renderProjectPage()

    expect(screen.getByRole('heading', { name: 'Public Sprint Board' })).toBeInTheDocument()
    expect(screen.getByText('Open Access')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Join Project' }))

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/project-members/project/project-1/join')
      expect(routerInvalidateMock).toHaveBeenCalled()
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project successfully!')
    })
  })

  it('renders member view controls when full details are available', async () => {
    loaderDataMock.mockReturnValue({
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
    })

    await renderProjectPage()

    expect(screen.getByRole('heading', { name: 'Internal Planning Board' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument()
    expect(screen.getByText('Private')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join Project' })).not.toBeInTheDocument()
  })
})
