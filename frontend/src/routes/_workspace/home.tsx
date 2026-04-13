import { useMemo, useState } from 'react'
import { createFileRoute, Link, useRouter} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {toast} from 'sonner'
import {
  Plus, FolderPlus, CheckCircle2, Clock,
  TrendingUp, ArrowRight, Calendar, LayoutGrid, ChevronDown,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import api from '@/api/axios'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TaskCounts {
  total: number
  todo: number
  in_progress: number
  blocked: number
  done: number
}

export interface Project {
  _id: string
  name: string
  description: string
  visibility: string
  dueDate?: string
  status?: 'planning' | 'active' | 'on_hold' | 'completed'
  memberCount: number
  taskCounts: TaskCounts
  updatedAt?: string
}

interface Invitation {
  _id: string
  projectId: {
    _id: string
    name: string
  }
  joinedBy?: {
    profile?: {
      displayName?: string
    }
    email?: string
  }
}

// ── Route + Loader ─────────────────────────────────────────────────────────────
// GET /api/projects returns a plain array
export const Route = createFileRoute('/_workspace/home')({
  // Add this line to force refetching on invalidation
  staleTime: 0,
  loader: async (): Promise<{ projects: Project[]; invitations: Invitation[] }> => {
    try {
      // Adding a timestamp/cache-buster is a safe fallback if your
      // browser or a proxy is caching the GET requests
      const [projectsRes, invitationsRes] = await Promise.all([
        api.get<Project[]>(`/projects?t=${Date.now()}`),
        api.get(`/project-members/me/invitations?t=${Date.now()}`),
      ])

      return {
        projects: Array.isArray(projectsRes.data) ? projectsRes.data : [],
        invitations: invitationsRes.data ?? [],
      }
    } catch {
      return { projects: [], invitations: [] }
    }
  },
  component: Home,
})

// ── Helpers ────────────────────────────────────────────────────────────────────
const PROJECT_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-yellow-500', 'bg-pink-500', 'bg-orange-500',
]
function getColor(i: number) { return PROJECT_COLORS[i % PROJECT_COLORS.length] }

type StatusKey = 'in-progress' | 'completed' | 'overdue'

function StatusBadge({ project }: { project: Project }) {
  const now = new Date()
  const due = project.dueDate ? new Date(project.dueDate) : null
  const isCompleted = project.status === 'completed'
  const isOverdue = !isCompleted && due && due < now && project.taskCounts.done < project.taskCounts.total
  const status: StatusKey = isOverdue ? 'overdue' : isCompleted ? 'completed' : 'in-progress'
  const map: Record<StatusKey, { classes: string; label: string }> = {
    'in-progress': { classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'In Progress' },
    completed:     { classes: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Completed' },
    overdue:       { classes: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Overdue' },
  }
  const { classes, label } = map[status]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <FolderPlus className="size-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Welcome to Taskademia!</h2>
      <p className="max-w-sm text-muted-foreground">
        You don't have any active projects yet. Create your first workspace to start managing your tasks.
      </p>
      <Button className="mt-4 cursor-pointer gap-1" asChild>
        <Link to="/projects/new"><Plus />Create First Project</Link>
      </Button>
    </div>
  )
}

function Home() {
  const { projects, invitations } = Route.useLoaderData()
  const router = useRouter()

  const [projectSort, setProjectSort] = useState<'name' | 'dueDate' | 'completion' | 'lastWorkedOn'>('name')

  const sortProjects = (list: Project[]) => {
    const sorted = [...list]

    sorted.sort((a, b) => {
      switch (projectSort) {
        case 'name':
          return a.name.localeCompare(b.name)

        case 'dueDate': {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          return aTime - bTime
        }

        case 'completion': {
          const aPct = a.taskCounts.total > 0 ? a.taskCounts.done / a.taskCounts.total : 0
          const bPct = b.taskCounts.total > 0 ? b.taskCounts.done / b.taskCounts.total : 0
          return bPct - aPct
        }

        case 'lastWorkedOn': {
          const aTime = 'updatedAt' in a ? new Date((a as Project & { updatedAt?: string }).updatedAt ?? 0).getTime() : 0
          const bTime = 'updatedAt' in b ? new Date((b as Project & { updatedAt?: string }).updatedAt ?? 0).getTime() : 0
          return bTime - aTime
        }

        default:
          return 0
      }
    })

    return sorted
  }

  const activeProjects = useMemo(
    () => sortProjects(projects.filter((p: Project) => p.status !== 'completed')),
    [projects, projectSort]
  )

  const completedProjects = useMemo(
    () => sortProjects(projects.filter((p: Project) => p.status === 'completed')),
    [projects, projectSort]
  )
  const hasActiveProjects = activeProjects.length > 0
  const hasCompletedProjects = completedProjects.length > 0

  // Centralized handler for Accept/Reject actions
  const handleInviteAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await api.post(`/project-members/${id}/accept`)
        toast.success("Joined project!")
      } else {
        await api.delete(`/project-members/${id}/reject`)
        toast.success("Invitation declined")
      }

      // Tell the router the current data is invalid
      await router.invalidate()

      // The "Hammer": Force the router to re-process the current route
      // This often kicks the loader into gear when invalidate() is being ignored
      await router.navigate({ from: Route.fullPath, replace: true })

    } catch (error) {
      toast.error("Something went wrong")
      console.error(error)
    }
  }

  const hasInvitations = invitations && invitations.length > 0

  if (!hasActiveProjects && !hasCompletedProjects && !hasInvitations) return <EmptyState />

  // --- Stats Calculation ---
  const totalTasks     = activeProjects.reduce((s: number, p: Project) => s + p.taskCounts.total, 0)
  const completedTasks = activeProjects.reduce((s: number, p: Project) => s + p.taskCounts.done, 0)
  const dueThisWeek    = activeProjects.filter((p: Project) => {
    if (!p.dueDate) return false
    const due = new Date(p.dueDate), now = new Date(), week = new Date()
    week.setDate(now.getDate() + 7)
    return due >= now && due <= week
  }).length
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const inProgressCount = activeProjects.filter((p: Project) => p.taskCounts.total > 0 && p.taskCounts.done < p.taskCounts.total).length

  const stats = [
    { label: 'Active Projects', value: String(activeProjects.length), icon: LayoutGrid, sub: `${inProgressCount} in progress` },
    { label: 'Tasks Completed', value: String(completedTasks),  icon: CheckCircle2, sub: `${totalTasks - completedTasks} remaining` },
    { label: 'Due This Week',   value: String(dueThisWeek),     icon: Clock,        sub: 'Stay on track' },
    { label: 'Completion Rate', value: `${completionRate}%`,    icon: TrendingUp,   sub: 'Across all projects' },
  ]

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Home</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You have <span className="font-medium text-foreground">{dueThisWeek} project{dueThisWeek !== 1 ? 's' : ''}</span> due this week.
            </p>
          </div>
          <Button asChild className="cursor-pointer gap-1">
            <Link to="/projects/new"><Plus className="size-4" />New Project</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, sub }) => (
              <Card key={label} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <Icon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
                </CardContent>
              </Card>
          ))}
        </div>

        {/* Invitations Section */}
        <div>
          {invitations.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Invitations</h2>
                </div>

                <div className="grid max-h-75 overflow-y-auto gap-3 md:grid-cols-2">
                  {invitations.map((invite: Invitation) => (
                      <div key={invite._id} className="relative group">
                        <Card className="border-border/50 bg-card/50 transition-colors hover:bg-card/80">
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-base truncate pr-4">{invite.projectId?.name}</CardTitle>
                              {/* Optional: Add a link to the project preview if needed */}
                              <Link
                                  to="/projects/$projectId"
                                  params={{ projectId: invite.projectId._id }}
                                  className="text-xs text-blue-400 hover:underline"
                              >
                                View
                              </Link>
                            </div>
                            <CardDescription className="text-xs">
                              Invited by {invite.joinedBy?.profile?.displayName ?? invite.joinedBy?.email ?? 'Someone'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex gap-2 p-4 pt-0">
                            <Button
                                size="sm"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  await handleInviteAction(invite._id, 'accept')
                                }}>
                              Accept
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  await handleInviteAction(invite._id, 'reject')
                                }}
                            >
                              Reject
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* Projects List */}
        {!hasActiveProjects && (
          <Card className="border-dashed border-border/50 bg-card/30">
            <CardContent className="p-6 text-sm text-muted-foreground">
              You don’t have any current projects right now. Your completed projects are in Project History below.
            </CardContent>
          </Card>
        )}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Current Projects</h2>

            <div className="flex items-center gap-2">
              <select
                value={projectSort}
                onChange={(e) =>
                  setProjectSort(e.target.value as 'name' | 'dueDate' | 'completion' | 'lastWorkedOn')
                }
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="name">Sort by Name</option>
                <option value="dueDate">Sort by Due Date</option>
                <option value="completion">Sort by Completion</option>
                <option value="lastWorkedOn">Sort by Last Worked On</option>
              </select>

              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" asChild>
                <Link to="/projects/new">New <ArrowRight className="size-3" /></Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeProjects.map((project: Project, index: number) => {
              const { total, done } = project.taskCounts
              const progress = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                  <Link key={project._id} to="/projects/$projectId" params={{ projectId: project._id }} className="block h-full">
                    <Card className="h-full cursor-pointer border-border/50 bg-card/50 transition-all duration-150 hover:border-border hover:bg-card">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start gap-2">
                          <div className={`mt-1.5 size-2 shrink-0 rounded-full ${getColor(index)}`} />
                          <CardTitle className="flex-1 truncate text-sm font-semibold leading-snug">{project.name}</CardTitle>
                          <StatusBadge project={project} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4 pt-1">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{project.description}</p>
                        {total > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{done}/{total} tasks</span><span>{progress}%</span>
                              </div>
                              <div className="h-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                        )}
                        {project.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              <span>Due {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
              )
            })}

            <Link to="/projects/new" className="block">
              <Card className="flex min-h-40 cursor-pointer items-center justify-center border-dashed border-border/30 bg-card/20 transition-all duration-150 hover:border-border/60 hover:bg-card/50">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted"><Plus className="size-4" /></div>
                  <span className="text-xs font-medium">New Project</span>
                </div>
              </Card>
            </Link>
          </div>

          {hasCompletedProjects && (
            <Card className="mt-6 border-border/50 bg-card/50">
              <Collapsible>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between text-left">
                      <div>
                        <CardTitle className="text-base">Project History</CardTitle>
                        <CardDescription>
                          {completedProjects.length} completed project{completedProjects.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {completedProjects.map((project: Project, index: number) => {
                        const { total, done } = project.taskCounts
                        const progress = total > 0 ? Math.round((done / total) * 100) : 0

                        return (
                          <Link
                            key={project._id}
                            to="/projects/$projectId"
                            params={{ projectId: project._id }}
                            className="block h-full"
                          >
                            <Card className="h-full cursor-pointer border-border/50 bg-card/40 transition-all duration-150 hover:border-border hover:bg-card">
                              <CardHeader className="p-4 pb-2">
                                <div className="flex items-start gap-2">
                                  <div className={`mt-1.5 size-2 shrink-0 rounded-full ${getColor(index)}`} />
                                  <CardTitle className="flex-1 truncate text-sm font-semibold leading-snug">
                                    {project.name}
                                  </CardTitle>
                                  <StatusBadge project={project} />
                                </div>
                              </CardHeader>

                              <CardContent className="space-y-3 p-4 pt-1">
                                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {project.description}
                                </p>

                                {total > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{done}/{total} tasks</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full bg-primary transition-all"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {project.dueDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="size-3" />
                                    <span>
                                      Due {new Date(project.dueDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        )
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </div>
      </div>
  )
}
