import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loaderDataMock, routerInvalidateMock, routerNavigateMock, postMock, deleteMock, toastSuccessMock } =
  vi.hoisted(() => ({
    loaderDataMock: vi.fn(),
    routerInvalidateMock: vi.fn(),
    routerNavigateMock: vi.fn(),
    postMock: vi.fn(),
    deleteMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }))

vi.mock('@/api/axios', () => ({
  default: {
    post: postMock,
    delete: deleteMock,
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )

  return {
    ...actual,
    useRouter: () => ({
      invalidate: routerInvalidateMock,
      navigate: routerNavigateMock,
    }),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? '#'} {...props}>
        {children}
      </a>
    ),
  }
})

describe.skip('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    routerInvalidateMock.mockResolvedValue(undefined)
    routerNavigateMock.mockResolvedValue(undefined)
  })

  async function renderHomePage() {
    const mod = await import('./home')
    ;(mod.Route as any).useLoaderData = loaderDataMock
    const HomePage = (mod.Route as any).options?.component
    return render(<HomePage />)
  }

  it('renders empty state when there are no projects or invitations', async () => {
    loaderDataMock.mockReturnValue({ projects: [], invitations: [] })

    await renderHomePage()

    expect(screen.getByText('Welcome to Taskademia!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create First Project/i })).toBeInTheDocument()
  })

  it('accepts and rejects invitations via action buttons', async () => {
    loaderDataMock.mockReturnValue({
      projects: [],
      invitations: [
        {
          _id: 'invite-1',
          projectId: { _id: 'p1', name: 'Invite Project' },
          joinedBy: { email: 'owner@test.com' },
        },
      ],
    })

    postMock.mockResolvedValue(undefined)
    deleteMock.mockResolvedValue(undefined)

    await renderHomePage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/project-members/invite-1/accept')
      expect(routerInvalidateMock).toHaveBeenCalled()
      expect(routerNavigateMock).toHaveBeenCalledWith(expect.objectContaining({ replace: true }))
      expect(toastSuccessMock).toHaveBeenCalledWith('Joined project!')
    })

    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/project-members/invite-1/reject')
      expect(toastSuccessMock).toHaveBeenCalledWith('Invitation declined')
    })
  })
})
