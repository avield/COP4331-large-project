import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus, FolderPlus, CheckCircle2, Clock,
  TrendingUp, ArrowRight, Calendar, LayoutGrid,
} from 'lucide-react'
import api from '@/api/axios'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TaskCounts {
  total: number
  todo: number
  in_progress: number
  blocked: number
  done: number
}

interface Project {
  _id: string
  name: string
  description: string
  visibility: string
  dueDate?: string
  memberCount: number
  taskCounts: TaskCounts
}

// ── Route + Loader ─────────────────────────────────────────────────────────────
// GET /api/projects returns a plain array
export const Route = createFileRoute('/_workspace/home')({
  loader: async (): Promise<Project[]> => {
    try {
      const res = await api.get<Project[]>('/projects')
      return Array.isArray(res.data) ? res.data : []
    } catch {
      return []
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
  const isOverdue = due && due < now && project.taskCounts.done < project.taskCounts.total
  const isCompleted = project.taskCounts.total > 0 && project.taskCounts.done === project.taskCounts.total
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
  const projects = Route.useLoaderData()

  if (!projects || projects.length === 0) return <EmptyState />

  const totalTasks     = projects.reduce((s: number, p: Project) => s + p.taskCounts.total, 0)
  const completedTasks = projects.reduce((s: number, p: Project) => s + p.taskCounts.done, 0)
  const dueThisWeek    = projects.filter((p: Project) => {
    if (!p.dueDate) return false
    const due = new Date(p.dueDate), now = new Date(), week = new Date()
    week.setDate(now.getDate() + 7)
    return due >= now && due <= week
  }).length
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const inProgressCount = projects.filter((p: Project) => p.taskCounts.total > 0 && p.taskCounts.done < p.taskCounts.total).length

  const stats = [
    { label: 'Active Projects', value: String(projects.length), icon: LayoutGrid,   sub: `${inProgressCount} in progress` },
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your Projects</h2>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" asChild>
            <Link to="/projects/new">New <ArrowRight className="size-3" /></Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project, index: number) => {
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
            <Card className="flex min-h-[160px] cursor-pointer items-center justify-center border-dashed border-border/30 bg-card/20 transition-all duration-150 hover:border-border/60 hover:bg-card/50">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted"><Plus className="size-4" /></div>
                <span className="text-xs font-medium">New Project</span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
