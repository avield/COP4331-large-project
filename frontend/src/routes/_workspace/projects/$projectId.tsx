import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { CalendarDays, Lock, Globe, Users, Settings, Pencil, UserPlus, Loader2, Check } from 'lucide-react'
import { KanbanColumn, type Column } from './components/column'
import type { Task } from './components/task'
import api from '@/api/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
} from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
//import { AvatarGroup } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { useAuthStore } from '@/api/authStore'
import { NetworkAvatar } from '@/components/network-avatar'
import { toast } from 'sonner'
import { GoalsOverviewChart } from "./components/goals-overview-chart"
import { ProjectProgressAreaChart } from "./components/area-chart"

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  loader: async ({ params }) => {
    try {
      const res = await api.get(`/projects/${params.projectId}/details`)
      return { ...res.data, isFullDetails: true }
    } catch {
      // Logic for the fallback (Visitor View)
      try {
        const fallbackRes = await api.get(`/projects/${params.projectId}`)
        return {
          project: fallbackRes.data.project ?? fallbackRes.data,
          isFullDetails: false
        }
      } catch (fallbackError) {
        console.error("Critical error loading project:", fallbackError)
        throw fallbackError // Or return a custom error state
      }
    }
  },
  component: ProjectPage,
})

export type BoardData = {
  tasks: Record<string, Task>
  columns: Record<string, Column>
  columnOrder: string[]
}

interface ApiUserSummary {
  _id: string
  displayName?: string
  email?: string
  username?: string
  profile?: {
    displayName?: string
    profilePictureUrl?: string
  }
}

// Shape from GET /api/projects/:projectId/details
interface ApiTask {
  _id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high'
  tags?: string[]
  assignedToUserIds?: ApiUserSummary[]
  roleRequired?: string
  dueDate?: string | null
  createdAt?: string | null
  completedAt?: string | null
  completedBy?: ApiUserSummary | null
  createdBy?: ApiUserSummary | null
  goalId?: string | null
}

interface ApiMember {
  _id: string
  projectId: string
  userId: {
    _id: string
    email?: string
    profile?: {
      displayName?: string
      profilePictureUrl?: string
    }
    displayName?: string
    avatarUrl?: string
  }
  role: string
  permissions: {
    canEditProject: boolean
    canManageMembers: boolean
    canCreateTasks: boolean
    canAssignTasks: boolean
    canCompleteAnyTask: boolean
    canModerateChat: boolean
  }
  membershipStatus: 'active' | 'pending' | 'removed'
  joinedBy?: {
    id?: string
    email?: string
  }
  createdAt?: string
  updatedAt?: string
}

interface ApiProject {
  _id: string
  name: string
  description: string
  dueDate?: string | null
  visibility?: 'public' | 'private'
  recruitingStatus?: 'open' | 'closed'
  lookingForRoles?: string[]
  tags?: string[]
  status?: 'planning' | 'active' | 'on_hold' | 'completed'
  settings?: {
    allowSelfJoinRequests?: boolean
    requireApprovalToJoin?: boolean
  }
  createdBy?: {
    _id: string
    displayName?: string
  } | null
}

interface ApiGoal {
  _id: string
  projectId: string
  title: string
  description?: string
  order: number
  createdBy?: {
    _id: string
    email?: string
    profile?: {
      displayName?: string
    }
  } | null
  createdAt?: string
  updatedAt?: string
}

interface ApiResponse {
  project: ApiProject
  members?: ApiMember[]
  tasks: ApiTask[]
  goals?: ApiGoal[]
  permissions?: {
    canEditProject?: boolean
    canJoinProject?: boolean
  }
}

function mapPriority(p: string): Task['priority'] {
  if (p === 'high') return 'High'
  if (p === 'low') return 'Low'
  return 'Medium'
}

function normalizeAssignedUsers(
  users?: Array<
    | string
    | {
        _id?: string
        displayName?: string
        email?: string
        username?: string
        profile?: {
          displayName?: string
          profilePictureUrl?: string
        }
      }
  >
) {
  return (users ?? [])
    .map((user) => {
      if (typeof user === 'string') {
        return {
          _id: user,
          displayName: '',
          email: '',
          username: '',
          profile: undefined,
        }
      }

      return {
        ...user,
        _id: user._id ?? '',
        displayName:
          user.displayName ??
          user.profile?.displayName ??
          user.email ??
          '',
      }
    })
    .filter((user) => user._id)
}

function buildBoardData(apiData: ApiResponse): BoardData {
  const tasks: Record<string, Task> = {}
  const todo: string[] = []
  const inProgress: string[] = []
  const blocked: string[] = []
  const done: string[] = []

  for (const t of (apiData.tasks ?? [])) {
    const id = t._id

    tasks[id] = {
      id,
      title: t.title,
      description: t.description ?? '',
      status: t.status,
      priority: mapPriority(t.priority),
      tags: t.tags ?? [],
      assignedToUserIds: normalizeAssignedUsers(t.assignedToUserIds),
      roleRequired: t.roleRequired ?? '',
      dueDate: t.dueDate ?? null,
      createdAt: t.createdAt ?? null,
      completedAt: t.completedAt ?? null,
      completedBy: t.completedBy ?? null,
      createdBy: t.createdBy ?? null,
      goalId: t.goalId ?? null,
    }

    switch (t.status) {
      case 'done':        done.push(id);       break
      case 'in_progress': inProgress.push(id); break
      case 'blocked':     blocked.push(id);    break
      default:            todo.push(id)
    }
  }

  return {
    tasks,
    columns: {
      'col-1': { id: 'col-1', title: 'To Do',       taskIds: todo },
      'col-2': { id: 'col-2', title: 'In Progress', taskIds: inProgress },
      'col-3': { id: 'col-3', title: 'Blocked',     taskIds: blocked },
      'col-4': { id: 'col-4', title: 'Done',        taskIds: done },
    },
    columnOrder: ['col-1', 'col-2', 'col-3', 'col-4'],
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'No due date'
  return new Date(value).toLocaleDateString()
}

function columnIdToStatus(columnId: string): ApiTask['status'] {
  switch (columnId) {
    case 'col-1':
      return 'todo'
    case 'col-2':
      return 'in_progress'
    case 'col-3':
      return 'blocked'
    case 'col-4':
      return 'done'
    default:
      return 'todo'
  }
}

function ProjectPage() {
  // Core Auth & Router
  const user = useAuthStore((state) => state.user)
  const currentUserId = user?.id
  const navigate = useNavigate()
  const router = useRouter()

  // Data from Loader
  const loaderData = Route.useLoaderData() as ApiResponse & { isFullDetails: boolean }
  const { isFullDetails, project } = loaderData
  const members = useMemo(() => loaderData.members ?? [], [loaderData.members])
  const goals = useMemo(() => loaderData.goals ?? [], [loaderData.goals])

  // Main Project State
  const [data, setData] = useState<BoardData>(() => buildBoardData(loaderData))

  // UI Visibility States
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false)
  const [isGoalDeleteDialogOpen, setIsGoalDeleteDialogOpen] = useState(false)

  // Mode & Selection States
  const [taskSheetMode, setTaskSheetMode] = useState<'view' | 'edit' | 'create'>('view')
  const [goalSheetMode, setGoalSheetMode] = useState<'create' | 'edit'>('create')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<ApiGoal | null>(null)
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null)

  // Form States
  const [editForm, setEditForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    visibility: project?.visibility ?? 'private',
    recruitingStatus: project?.recruitingStatus ?? 'closed',
    status: project?.status ?? 'planning',
    dueDate: project?.dueDate ? project.dueDate.slice(0, 10) : '',
    tags: (project?.tags ?? []).join(', '),
    lookingForRoles: (project?.lookingForRoles ?? []).join(', '),
    allowSelfJoin: project?.settings?.allowSelfJoinRequests ?? false,
    requireApprovalToJoin: project?.settings?.requireApprovalToJoin ?? true,
  })

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as Task['priority'],
    status: 'todo' as Task['status'],
    roleRequired: '',
    dueDate: '',
    tags: '',
    goalId: '',
    assignedToUserIds: [] as string[],
  })

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
  })

  // Loading & Error States
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false)
  const [isDeletingGoal, setIsDeletingGoal] = useState(false)
  const [projectSaveError, setProjectSaveError] = useState('')
  const [deleteProjectError, setDeleteProjectError] = useState('')
  const [goalError, setGoalError] = useState('')
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null)

  // Permission & Membership Logic
  const myMembership = useMemo(() => members.find(
      (m) => m.membershipStatus === 'active' && m.userId?._id === currentUserId
  ), [members, currentUserId])

  const canEditProject = myMembership?.permissions?.canEditProject ?? false
  const canJoinProject = !!loaderData.permissions?.canJoinProject

  // Memos for Analytics & UI
  const goalNameById = useMemo(() => {
    return Object.fromEntries(goals.map((g) => [g._id, g.title]))
  }, [goals])

  const goalProgress = useMemo(() => {
    const allTasks = Object.values(data.tasks || {})
    return goals.map((goal) => {
      const goalTasks = allTasks.filter((t) => t.goalId === goal._id)

      const todo = goalTasks.filter((t) => t.status === 'todo').length
      const inProgress = goalTasks.filter((t) => t.status === 'in_progress').length
      const blocked = goalTasks.filter((t) => t.status === 'blocked').length
      const done = goalTasks.filter((t) => t.status === 'done').length
      const total = goalTasks.length

      return {
        ...goal, // Keeps _id, title, description
        total,
        todo,
        inProgress,
        blocked,
        done,
        percentComplete: total > 0 ? Math.round((done / total) * 100) : 0,
        // Flags for the Badge UI
        hasInProgress: inProgress > 0,
        hasBlocked: blocked > 0,
        // For Radial Chart
        name: goal.title,
        value: total > 0 ? Math.round((done / total) * 100) : 0
      }
    })
  }, [goals, data.tasks])

  const assigneeOptions = useMemo(() => {
    return members
        .filter((member) => member.membershipStatus === 'active' && member.userId)
        .map((member) => {
          const u = member.userId;
          const label =
              u?.profile?.displayName ||
              u?.displayName ||
              u?.email ||
              'Unknown Member';

          return {
            id: u?._id || '',
            label: label,
          };
        });
  }, [members]);

  // Match the format expected by the Radial chart component
  const goalChartData = useMemo(() => {
    return goalProgress.map(g => ({ name: g.name, value: g.value }))
  }, [goalProgress])

  const ungroupedTaskCount = useMemo(() => {
    return Object.values(data.tasks || {}).filter((t) => !t.goalId).length
  }, [data.tasks])

  const memberPreview = useMemo(() => {
    return members.slice(0, 5)
  }, [members])

  
  // ********************
  // TASK CRUD OPERATIONS
  // ********************
  const handleDeleteTask = (columnId: string, taskId: string) => {
    const newColumnTaskIds = data.columns[columnId].taskIds.filter((id) => id !== taskId)
    const newTasks = { ...data.tasks }
    delete newTasks[taskId]

    setData({
      ...data,
      tasks: newTasks,
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          taskIds: newColumnTaskIds,
        },
      },
    })
  }

  function statusToColumnId(status: ApiTask['status']): string {
    switch (status) {
      case 'todo':
        return 'col-1'
      case 'in_progress':
        return 'col-2'
      case 'blocked':
        return 'col-3'
      case 'done':
        return 'col-4'
      default:
        return 'col-1'
    }
  }

  const handleAddTask = (columnId: string) => {
    setCreateTaskColumnId(columnId)
    setSelectedTask(null)
    setTaskForm({
      title: '',
      description: '',
      status: columnIdToStatus(columnId),
      priority: 'Medium',
      roleRequired: '',
      dueDate: '',
      tags: '',
      goalId: '',
      assignedToUserIds: [],
    })
    setTaskSheetMode('create')
    setIsTaskSheetOpen(true)
  }

  const handleCreateTask = async () => {
    if (!createTaskColumnId) return

    const trimmedTitle = taskForm.title.trim()
    if (!trimmedTitle) return

    try {
      const res = await api.post('/tasks', {
        projectId: project._id,
        title: trimmedTitle,
        description: taskForm.description.trim(),
        status: taskForm.status,
        priority: taskForm.priority.toLowerCase(),
        tags: taskForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        roleRequired: taskForm.roleRequired.trim(),
        dueDate: taskForm.dueDate || null,
        goalId: taskForm.goalId || null,
        assignedToUserIds: taskForm.assignedToUserIds,
      })

      const created = res.data.task ?? res.data

      const newTask: Task = {
        id: created._id,
        title: created.title,
        description: created.description ?? '',
        status: created.status,
        priority: mapPriority(created.priority),
        tags: created.tags ?? [],
        assignedToUserIds: normalizeAssignedUsers(created.assignedToUserIds),
        roleRequired: created.roleRequired ?? '',
        dueDate: created.dueDate ?? null,
        completedAt: created.completedAt ?? null,
        completedBy: created.completedBy ?? null,
        createdBy: created.createdBy ?? null,
        goalId: created.goalId ?? null,
      }

      const targetColumnId = statusToColumnId(newTask.status)

      setData((prev) => ({
        ...prev,
        tasks: {
          ...prev.tasks,
          [newTask.id]: newTask,
        },
        columns: {
          ...prev.columns,
          [targetColumnId]: {
            ...prev.columns[targetColumnId],
            taskIds: [...prev.columns[targetColumnId].taskIds, newTask.id],
          },
        },
      }))

      setIsTaskSheetOpen(false)
      setCreateTaskColumnId(null)
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleSaveTask = async () => {
    if (!selectedTask) return

    try {
      const res = await api.put(`/tasks/${selectedTask.id}`, {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority.toLowerCase(),
        status: taskForm.status,
        roleRequired: taskForm.roleRequired,
        dueDate: taskForm.dueDate || null,
        goalId: taskForm.goalId || null,
        assignedToUserIds: taskForm.assignedToUserIds,
        tags: taskForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      const updatedTask = res.data.task ?? res.data

      setData((prev) => {
        const oldStatus = prev.tasks[selectedTask.id]?.status ?? 'todo'
        const newStatus = updatedTask.status as ApiTask['status']

        const oldColumnId = statusToColumnId(oldStatus)
        const newColumnId = statusToColumnId(newStatus)

        const nextTasks = {
          ...prev.tasks,
          [selectedTask.id]: {
            ...prev.tasks[selectedTask.id],
            title: updatedTask.title,
            description: updatedTask.description ?? '',
            status: newStatus,
            priority: mapPriority(updatedTask.priority),
            tags: updatedTask.tags ?? [],
            roleRequired: updatedTask.roleRequired ?? '',
            dueDate: updatedTask.dueDate ?? null,
            assignedToUserIds: normalizeAssignedUsers(updatedTask.assignedToUserIds),
            completedAt: updatedTask.completedAt ?? null,
            completedBy: updatedTask.completedBy ?? null,
            createdBy: updatedTask.createdBy ?? null,
            goalId: updatedTask.goalId ?? null,
          },
        }

        if (oldColumnId === newColumnId) {
          return {
            ...prev,
            tasks: nextTasks,
          }
        }

        return {
          ...prev,
          tasks: nextTasks,
          columns: {
            ...prev.columns,
            [oldColumnId]: {
              ...prev.columns[oldColumnId],
              taskIds: prev.columns[oldColumnId].taskIds.filter((id) => id !== selectedTask.id),
            },
            [newColumnId]: {
              ...prev.columns[newColumnId],
              taskIds: [...prev.columns[newColumnId].taskIds, selectedTask.id],
            },
          },
        }
      })

      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              title: updatedTask.title,
              description: updatedTask.description ?? '',
              status: updatedTask.status,
              priority: mapPriority(updatedTask.priority),
              tags: updatedTask.tags ?? [],
              roleRequired: updatedTask.roleRequired ?? '',
              dueDate: updatedTask.dueDate ?? null,
              assignedToUserIds: normalizeAssignedUsers(updatedTask.assignedToUserIds),
              completedAt: updatedTask.completedAt ?? null,
              completedBy: updatedTask.completedBy ?? null,
              createdBy: updatedTask.createdBy ?? null,
              goalId: updatedTask.goalId ?? null,
            }
          : prev
      )

      setIsTaskSheetOpen(false)
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const startColumn = data.columns[source.droppableId]
    const finishColumn = data.columns[destination.droppableId]

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds)
      newTaskIds.splice(source.index, 1)
      newTaskIds.splice(destination.index, 0, draggableId)

      setData((prev) => ({
        ...prev,
        columns: {
          ...prev.columns,
          [startColumn.id]: {
            ...startColumn,
            taskIds: newTaskIds,
          },
        },
      }))
      return
    }

    const startTaskIds = Array.from(startColumn.taskIds)
    startTaskIds.splice(source.index, 1)

    const finishTaskIds = Array.from(finishColumn.taskIds)
    finishTaskIds.splice(destination.index, 0, draggableId)

    const previousData = data

    setData((prev) => ({
      ...prev,
      // ADD THIS: Update the individual task's status locally
      tasks: {
        ...prev.tasks,
        [draggableId]: {
          ...prev.tasks[draggableId],
          status: columnIdToStatus(destination.droppableId),
        },
      },
      columns: {
        ...prev.columns,
        [startColumn.id]: {
          ...startColumn,
          taskIds: startTaskIds,
        },
        [finishColumn.id]: {
          ...finishColumn,
          taskIds: finishTaskIds,
        },
      },
    }))

    setSavingTaskId(draggableId)
    setSavedTaskId(null)

    try {
      await api.put(`/tasks/${draggableId}`, {
        status: columnIdToStatus(destination.droppableId),
      })

      setSavingTaskId(null)
      setSavedTaskId(draggableId)

      setTimeout(() => {
        setSavedTaskId((current) => (current === draggableId ? null : current))
      }, 1500)
    } catch (error) {
      console.error('Failed to persist task status update:', error)
      setSavingTaskId(null)
      setSavedTaskId(null)
      setData(previousData)
    }
  }

  const projectTaskStats = useMemo(() => {
    const allTasks = Object.values(data.tasks)
    const total = allTasks.length
    const done = allTasks.filter((task) => task.status === 'done').length
    const inProgress = allTasks.filter((task) => task.status === 'in_progress').length
    const blocked = allTasks.filter((task) => task.status === 'blocked').length
    const todo = allTasks.filter((task) => task.status === 'todo').length

    return {
      total,
      done,
      inProgress,
      blocked,
      todo,
      percentComplete: total > 0 ? Math.round((done / total) * 100) : 0,
    }
  }, [data.tasks])


  //  ********************
  //  GOAL CRUD OPERATIONS
  //  ********************
  const handleCreateGoal = async () => {
    const trimmedTitle = goalForm.title.trim()
    if (!trimmedTitle) return

    try {
      setGoalError('')
      setIsCreatingGoal(true)

      await api.post('/goals', {
        projectId: project._id,
        title: trimmedTitle,
        description: goalForm.description.trim(),
      })

      await router.invalidate()

      setGoalForm({
        title: '',
        description: '',
      })
      setIsGoalSheetOpen(false)
      toast.success('Goal created successfully.')
    } catch (error) {
      console.error('Failed to create goal:', error)
      setGoalError('Failed to create goal. Please try again.')
      toast.error('Failed to create goal.')
    } finally {
      setIsCreatingGoal(false)
    }
  }

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return

    const trimmedTitle = goalForm.title.trim()
    if (!trimmedTitle) return

    try {
      setGoalError('')
      setIsUpdatingGoal(true)

      await api.put(`/goals/${selectedGoal._id}`, {
        title: trimmedTitle,
        description: goalForm.description.trim(),
      })

      await router.invalidate()
      setIsGoalSheetOpen(false)
      setSelectedGoal(null)
      setGoalForm({
        title: '',
        description: '',
      })
      toast.success('Goal updated successfully.')
    } catch (error) {
      console.error('Failed to update goal:', error)
      setGoalError('Failed to update goal. Please try again.')
      toast.error('Failed to update goal.')
    } finally {
      setIsUpdatingGoal(false)
    }
  }
  
  const handleDeleteGoal = async (taskAction: 'unassign' | 'delete') => {
    if (!selectedGoal) return

    try {
      setIsDeletingGoal(true)

      await api.delete(`/goals/${selectedGoal._id}`, {
        params: { taskAction },
      })

      await router.invalidate()
      setIsGoalDeleteDialogOpen(false)
      setSelectedGoal(null)

      toast.success(
        taskAction === 'delete'
          ? 'Goal and associated tasks deleted.'
          : 'Goal deleted and tasks were unassigned.'
      )
    } catch (error) {
      console.error('Failed to delete goal:', error)
      toast.error('Failed to delete goal.')
    } finally {
      setIsDeletingGoal(false)
    }
  }

  //  ************************
  //  PROJECT CRUD OPERATIONS
  //  ************************

  const handleSaveProject = async () => {
    try {
      setProjectSaveError('')
      setIsSavingProject(true)

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        visibility: editForm.visibility,
        recruitingStatus: editForm.recruitingStatus,
        status: editForm.status,
        dueDate: editForm.dueDate || null,
        tags: editForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        lookingForRoles: editForm.lookingForRoles
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean),
        settings: {
          allowSelfJoinRequests: editForm.allowSelfJoin,
          requireApprovalToJoin: editForm.requireApprovalToJoin,
        },
      }

      await api.put(`/projects/${project._id}`, payload)

      await router.invalidate()

      setIsEditSheetOpen(false)
      toast.success('Project updated successfully.')
    } catch (error) {
      console.error('Failed to update project:', error)
      setProjectSaveError('Failed to save project changes. Please try again.')
      toast.error('Failed to update project.')
    } finally {
      setIsSavingProject(false)
    }
  }

const handleDeleteProject = async () => {
  try {
    setDeleteProjectError('')
    setIsDeletingProject(true)

    await api.delete(`/projects/${project._id}`)

    setIsEditSheetOpen(false)
    toast.success('Project deleted.', {
      description: 'Redirecting to your home page.',
    })

    navigate({ to: '/_workspace/home' })
  } catch (error) {
    console.error('Failed to delete project:', error)
    setDeleteProjectError('Failed to delete project. Please try again.')
    toast.error('Failed to delete project.')
  } finally {
    setIsDeletingProject(false)
  }
}

// VISITOR VIEW
if(!isFullDetails) {
  return (
      <div className="flex flex-col items-center justify-center py-24">
        <Lock className="size-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Private Workspace</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-sm">
          Detailed tasks and roadmap for <strong>{project.name}</strong> are restricted to project members.
        </p>
        <Button className="mt-6">
          <UserPlus className="mr-2 size-4" />
          Request to Join
        </Button>
      </div>
  )
}
// MEMBER VIEW
  return (
    <div className="flex h-full min-w-0 flex-col gap-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>

            <Badge variant={project.visibility === 'public' ? 'secondary' : 'outline'}>
              {project.visibility === 'public' ? 'Public' : 'Private'}
            </Badge>

            <Badge variant={project.recruitingStatus === 'open' ? 'default' : 'outline'}>
              {project.recruitingStatus === 'open' ? 'Recruiting' : 'Not Recruiting'}
            </Badge>

            <Badge variant="outline">
              {project.status ?? 'planning'}
            </Badge>
          </div>

          <p className="max-w-3xl text-muted-foreground">
            {project.description || 'No project description yet.'}
          </p>

          <div className="flex flex-wrap gap-2">
            {(project.tags ?? []).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canJoinProject && (
            <Button>
              <UserPlus className="mr-2 size-4" />
              Join Project
            </Button>
          )}

          {canEditProject && (
            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Pencil className="mr-2 size-4" />
                  Edit Project
                </Button>
              </SheetTrigger>

              <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Edit Project</SheetTitle>
                  <SheetDescription>
                    Update project information, recruiting, and join settings.
                  </SheetDescription>
                </SheetHeader>

                <div className="p-4 pt-0">
                  <FieldSet>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                        <Input
                          id="project-name"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="project-description">Description</FieldLabel>
                        <Textarea
                          id="project-description"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="project-due-date">Due date</FieldLabel>
                        <Input
                          id="project-due-date"
                          type="date"
                          value={editForm.dueDate}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              dueDate: e.target.value,
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="project-tags">Tags</FieldLabel>
                        <Input
                          id="project-tags"
                          placeholder="react, typescript, ui"
                          value={editForm.tags}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, tags: e.target.value }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="looking-for-roles">Looking for roles</FieldLabel>
                        <Input
                          id="looking-for-roles"
                          placeholder="frontend, backend, designer"
                          value={editForm.lookingForRoles}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              lookingForRoles: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </FieldGroup>

                    <Separator />

                    <FieldSet>
                      <FieldLegend>Visibility</FieldLegend>
                      <RadioGroup
                        value={editForm.visibility}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            visibility: value as 'public' | 'private',
                          }))
                        }
                      >
                        <Field orientation="horizontal">
                          <RadioGroupItem value="public" id="visibility-public" />
                          <FieldContent>
                            <FieldLabel htmlFor="visibility-public">Public</FieldLabel>
                            <FieldDescription>
                              Anyone can discover this project.
                            </FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="private" id="visibility-private" />
                          <FieldContent>
                            <FieldLabel htmlFor="visibility-private">Private</FieldLabel>
                            <FieldDescription>
                              Only members can view this project.
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      </RadioGroup>
                    </FieldSet>

                    <FieldSet>
                      <FieldLegend>Recruiting status</FieldLegend>
                      <RadioGroup
                        value={editForm.recruitingStatus}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            recruitingStatus: value as 'open' | 'closed',
                          }))
                        }
                      >
                        <Field orientation="horizontal">
                          <RadioGroupItem value="open" id="recruiting-open" />
                          <FieldLabel htmlFor="recruiting-open">Open to new members</FieldLabel>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="closed" id="recruiting-closed" />
                          <FieldLabel htmlFor="recruiting-closed">Closed</FieldLabel>
                        </Field>
                      </RadioGroup>
                    </FieldSet>

                    <FieldSet>
                      <FieldLegend>Join settings</FieldLegend>
                      <RadioGroup
                        value={
                          editForm.allowSelfJoin
                            ? 'self_join'
                            : editForm.requireApprovalToJoin
                              ? 'approval'
                              : 'invite_only'
                        }
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            allowSelfJoin: value === 'self_join',
                            requireApprovalToJoin: value === 'approval',
                          }))
                        }
                      >
                        <Field orientation="horizontal">
                          <RadioGroupItem value="self_join" id="join-self" />
                          <FieldContent>
                            <FieldLabel htmlFor="join-self">Self join</FieldLabel>
                            <FieldDescription>
                              Users can join immediately.
                            </FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="approval" id="join-approval" />
                          <FieldContent>
                            <FieldLabel htmlFor="join-approval">Require approval</FieldLabel>
                            <FieldDescription>
                              Users can request to join and wait for approval.
                            </FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="invite_only" id="join-invite-only" />
                          <FieldContent>
                            <FieldLabel htmlFor="join-invite-only">Invite only</FieldLabel>
                            <FieldDescription>
                              No self-join or join requests.
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      </RadioGroup>
                    </FieldSet>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveProject} disabled={isSavingProject}>
                        {isSavingProject ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsEditSheetOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    {projectSaveError ? (
                      <p className="text-sm text-destructive">{projectSaveError}</p>
                    ) : null}

                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 py-4 text-sm">
                      <div className="px-4 pb-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-destructive/80">
                          Danger Zone
                        </h3>
                      </div>

                      <div className="px-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">Delete Project</p>
                            <p className="text-xs text-muted-foreground">
                              Permanently remove your project and all associated data.
                            </p>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                disabled={isDeletingProject}
                                className="h-7 shrink-0 cursor-pointer rounded-md bg-destructive/10 px-2.5 text-[0.8rem] font-medium text-destructive hover:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50"
                              >
                                {isDeletingProject ? 'Deleting...' : 'Delete'}
                              </button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <span className="font-medium">{project.name}</span> and all
                                  associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeletingProject}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.preventDefault()
                                    void handleDeleteProject()
                                  }}
                                  disabled={isDeletingProject}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeletingProject ? 'Deleting...' : 'Delete Project'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {deleteProjectError ? (
                          <p className="mt-3 text-xs text-destructive">
                            {deleteProjectError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </FieldSet>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Overview grid */}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                Core details, visibility, and recruiting information.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Due Date</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-4" />
                    <span>{formatDate(project.dueDate)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Visibility</div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {project.visibility === 'public' ? (
                      <Globe className="size-4" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                    <span>{project.visibility === 'public' ? 'Public' : 'Private'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Recruiting</div>
                  <div className="text-muted-foreground">
                    {project.recruitingStatus === 'open' ? 'Open to new members' : 'Closed'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Project Status</div>
                  <div className="text-muted-foreground">{project.status ?? 'planning'}</div>
                </div>
              </div>

            </CardContent>

            <Card>
              <CardHeader>
                <CardTitle>Project Completion</CardTitle>
                <CardDescription>
                  Overall progress across all project tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{projectTaskStats.done} of {projectTaskStats.total} tasks done</span>
                  <span>{projectTaskStats.percentComplete}%</span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${projectTaskStats.percentComplete}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>To Do: {projectTaskStats.todo}</span>
                  <span>In Progress: {projectTaskStats.inProgress}</span>
                  <span>Blocked: {projectTaskStats.blocked}</span>
                  <span>Done: {projectTaskStats.done}</span>
                </div>
              </CardContent>
            </Card>
          </Card>

          <ProjectProgressAreaChart tasks={Object.values(data.tasks)} />

          {(goals.length > 0 || canEditProject) && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Goals</CardTitle>
                  <CardDescription>
                    Progress toward project goals.
                  </CardDescription>
                </div>

                {canEditProject && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedGoal(null)
                      setGoalSheetMode('create')
                      setGoalError('')
                      setGoalForm({
                        title: '',
                        description: '',
                      })
                      setIsGoalSheetOpen(true)
                    }}
                  >
                    Add Goal
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {goalProgress.length > 0 && (
                  <GoalsOverviewChart data={goalChartData} />
                )}

                {goalProgress.length > 0 ? (
                  goalProgress.map((goal) => (
                    <div key={goal._id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{goal.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {goal.total > 0
                              ? `${goal.done}/${goal.total} tasks complete`
                              : 'No tasks assigned yet'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {goal.hasInProgress && <Badge variant="secondary">In Progress</Badge>}
                          {goal.hasBlocked && <Badge variant="destructive">Blocked</Badge>}
                          {canEditProject && (
                            <>
                              <Button variant="outline" size="sm">Edit</Button>
                              <Button variant="destructive" size="sm">Delete</Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{goal.percentComplete}% complete</span>
                        <span>
                          Todo {goal.todo} · In Progress {goal.inProgress} · Blocked {goal.blocked} · Done {goal.done}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No goals yet. Create a goal to start tracking progress across related tasks.
                  </div>
                )}

                {ungroupedTaskCount > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Tasks without a goal: {ungroupedTaskCount}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Join Settings</CardTitle>
              <CardDescription>
                How new members can join this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Settings className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  {project.settings?.allowSelfJoinRequests
                    ? 'Users can join immediately.'
                    : project.settings?.requireApprovalToJoin
                      ? 'Users must request approval to join.'
                      : 'Invite only.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Looking For</CardTitle>
              <CardDescription>
                Roles the project is currently recruiting for.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(project.lookingForRoles ?? []).length > 0 ? (
                  project.lookingForRoles?.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No roles listed.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Current project members and roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 max-h-[420px] space-y-4 overflow-y-auto pr-2">
              <AvatarGroup>
                {memberPreview.map((member) => {
                  const displayName = member.userId?.profile?.displayName ?? 'User'
                  const isMe = member.userId?._id === user?.id

                  // Always fallback to the fresh user store if it's the active session!
                  const avatarUrl = isMe
                      ? user?.profile?.profilePictureUrl
                      : member.userId?.profile?.profilePictureUrl

                  return (
                      <NetworkAvatar
                          key={member._id}
                          displayName={displayName}
                          profilePictureUrl={avatarUrl}
                          size="sm"
                      />
                  )
                })}

                {/* Show the remainder count if there are more than 5 members */}
                {members.length > 5 && (
                    <AvatarGroupCount>
                      +{members.length - 5}
                    </AvatarGroupCount>
                )}
              </AvatarGroup>

              <Separator />

              <div className="space-y-3">
                {members.length > 0 ? (
                  members.map((member) => {
                    const displayName = member.userId?.profile?.displayName ??
                        member.userId?.displayName ?? 'Unknown User';
                    const email = member.userId?.email ?? 'No email'

                    const isMe = member.userId?._id === user?.id
                    const avatarUrl = isMe
                    ? user?.profile?.profilePictureUrl
                        : member.userId?.profile?.profilePictureUrl;

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <NetworkAvatar
                              displayName={displayName}
                              profilePictureUrl={avatarUrl}
                              size="sm"
                          />

                          <div>
                            <div className="text-sm font-medium">{displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {email}
                            </div>
                          </div>
                        </div>

                        <Badge variant="outline">
                          {member.role ?? 'Member'}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    No members available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban board */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Project Board</CardTitle>
              <CardDescription>
                Drag and drop tasks to update their status.
              </CardDescription>
            </div>

            <div className="text-sm text-muted-foreground">
              {savingTaskId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </span>
              ) : savedTaskId ? (
                <span className="inline-flex items-center gap-2 text-green-600">
                  <Check className="size-4" />
                  Saved
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-w-full overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex w-max min-w-full gap-6 pb-4">
              {data.columnOrder.map((columnId, index) => {
                const column = data.columns[columnId]
                const tasks = column.taskIds.map((id) => data.tasks[id]).filter(Boolean)

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    columnIndex={index}
                    tasks={tasks}
                    goalNameById={goalNameById}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onTaskClick={(task) => {
                      setSelectedTask(task)
                      setTaskForm({
                        title: task.title,
                        description: task.description ?? '',
                        priority: task.priority,
                        status: task.status,
                        roleRequired: task.roleRequired ?? '',
                        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
                        tags: (task.tags ?? []).join(', '),
                        goalId: task.goalId ?? '',
                        assignedToUserIds: task.assignedToUserIds
                          ?.map((user) => typeof user === 'string' ? user : user._id)
                          .filter(Boolean) ?? [],
                      })
                      setTaskSheetMode('view')
                      setIsTaskSheetOpen(true)
                    }}
                  />
                )
              })}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

      <Sheet
        open={isGoalSheetOpen}
        onOpenChange={(open) => {
          setIsGoalSheetOpen(open)
          if (!open) {
            setGoalError('')
            if (goalSheetMode === 'create') {
              setGoalForm({
                title: '',
                description: '',
              })
            }
          }
        }}
      >
        <SheetContent className="overflow-y-auto p-0 sm:max-w-xl">
          <>
            <SheetHeader className="px-6 pt-6">
              <SheetTitle>
                {goalSheetMode === 'create' ? 'Create Goal' : 'Edit Goal'}
              </SheetTitle>
              <SheetDescription>
                {goalSheetMode === 'create'
                  ? 'Create a new goal for this project.'
                  : 'Update the goal information and save your changes.'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="space-y-4 px-6 pb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Goal Details</CardTitle>
                    <CardDescription>
                      {goalSheetMode === 'create'
                        ? 'Fill out the information for the new goal.'
                        : 'Update the goal information below.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldSet>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="goal-title">Goal title</FieldLabel>
                          <Input
                            id="goal-title"
                            value={goalForm.title}
                            onChange={(e) =>
                              setGoalForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                          />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="goal-description">Description</FieldLabel>
                          <Textarea
                            id="goal-description"
                            value={goalForm.description}
                            onChange={(e) =>
                              setGoalForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FieldGroup>
                    </FieldSet>
                  </CardContent>
                </Card>

                {goalError ? (
                  <p className="text-sm text-destructive">{goalError}</p>
                ) : null}
              </div>

              <div className="flex gap-2 border-t px-6 py-4">
                {goalSheetMode === 'create' ? (
                  <>
                    <Button onClick={handleCreateGoal} disabled={isCreatingGoal}>
                      {isCreatingGoal ? 'Creating...' : 'Create Goal'}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setGoalForm({
                          title: '',
                          description: '',
                        })
                        setGoalError('')
                        setIsGoalSheetOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleUpdateGoal} disabled={isUpdatingGoal}>
                      {isUpdatingGoal ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        if (!selectedGoal) return
                        setGoalForm({
                          title: selectedGoal.title,
                          description: selectedGoal.description ?? '',
                        })
                        setGoalError('')
                        setIsGoalSheetOpen(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isGoalDeleteDialogOpen} onOpenChange={setIsGoalDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete goal?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose whether to keep tasks and remove their goal assignment, or delete the
              goal and all tasks assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => void handleDeleteGoal('unassign')}
              disabled={isDeletingGoal}
            >
              {isDeletingGoal ? 'Deleting...' : 'Delete Goal Only'}
            </Button>

            <Button
              variant="destructive"
              onClick={() => void handleDeleteGoal('delete')}
              disabled={isDeletingGoal}
            >
              {isDeletingGoal ? 'Deleting...' : 'Delete Goal and Tasks'}
            </Button>

            <AlertDialogCancel disabled={isDeletingGoal}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isTaskSheetOpen} onOpenChange={setIsTaskSheetOpen}>
        <SheetContent className="overflow-y-auto p-0 sm:max-w-xl">
          <>
            <SheetHeader className='px-6 pt-6'>
              <SheetTitle>
                {taskSheetMode === 'create'
                  ? 'Create Task'
                  : taskSheetMode === 'edit'
                    ? 'Edit Task'
                    : selectedTask?.title ?? 'Task'}
              </SheetTitle>

              <SheetDescription>
                {taskSheetMode === 'create'
                  ? 'Add a new task to this project.'
                  : taskSheetMode === 'edit'
                    ? 'Update task information and save your changes.'
                    : 'View task details.'}
              </SheetDescription>
            </SheetHeader>

              <div className="mt-6 space-y-6">
                {taskSheetMode === 'edit' || taskSheetMode === 'create' ? (
                  <div className="space-y-4 px-6 pb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Task Details</CardTitle>
                        <CardDescription>
                          {taskSheetMode === 'create'
                            ? 'Fill out the information for the new task.'
                            : 'Update the task information below.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FieldSet>
                          <FieldGroup>
                            <Field>
                              <FieldLabel htmlFor="task-title">Title</FieldLabel>
                              <Input
                                id="task-title"
                                value={taskForm.title}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="task-description">Description</FieldLabel>
                              <Textarea
                                id="task-description"
                                value={taskForm.description}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="task-role-required">Role Required</FieldLabel>
                              <Input
                                id="task-role-required"
                                value={taskForm.roleRequired}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    roleRequired: e.target.value,
                                  }))
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel>Assigned To</FieldLabel>
                              <div className="space-y-2 rounded-md border p-3">
                                {assigneeOptions.length > 0 ? (
                                  assigneeOptions.map((member) => {
                                    const checked = taskForm.assignedToUserIds.includes(member.id)

                                    return (
                                      <label key={member.id} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            setTaskForm((prev) => ({
                                              ...prev,
                                              assignedToUserIds: e.target.checked
                                                ? [...prev.assignedToUserIds, member.id]
                                                : prev.assignedToUserIds.filter((id) => id !== member.id),
                                            }))
                                          }}
                                        />
                                        <span>{member.label}</span>
                                      </label>
                                    )
                                  })
                                ) : (
                                  <span className="text-sm text-muted-foreground">No members available.</span>
                                )}
                              </div>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="task-goal">Goal</FieldLabel>
                              <select
                                id="task-goal"
                                value={taskForm.goalId}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    goalId: e.target.value,
                                  }))
                                }
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none"
                              >
                                <option value="">No goal</option>
                                {goals.map((goal) => (
                                  <option key={goal._id} value={goal._id}>
                                    {goal.title}
                                  </option>
                                ))}
                              </select>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="task-due-date">Due Date</FieldLabel>
                              <Input
                                id="task-due-date"
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({
                                    ...prev,
                                    dueDate: e.target.value,
                                  }))
                                }
                              />
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="task-tags">Tags</FieldLabel>
                              <Input
                                id="task-tags"
                                placeholder="frontend, urgent, api"
                                value={taskForm.tags}
                                onChange={(e) =>
                                  setTaskForm((prev) => ({ ...prev, tags: e.target.value }))
                                }
                              />
                            </Field>
                          </FieldGroup>
                        </FieldSet>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FieldSet>
                          <RadioGroup
                            value={taskForm.status}
                            onValueChange={(value) =>
                              setTaskForm((prev) => ({
                                ...prev,
                                status: value as Task['status'],
                              }))
                            }
                          >
                            <Field orientation="horizontal">
                              <RadioGroupItem value="todo" id="task-status-todo" />
                              <FieldLabel htmlFor="task-status-todo">To Do</FieldLabel>
                            </Field>

                            <Field orientation="horizontal">
                              <RadioGroupItem value="in_progress" id="task-status-in-progress" />
                              <FieldLabel htmlFor="task-status-in-progress">In Progress</FieldLabel>
                            </Field>

                            <Field orientation="horizontal">
                              <RadioGroupItem value="blocked" id="task-status-blocked" />
                              <FieldLabel htmlFor="task-status-blocked">Blocked</FieldLabel>
                            </Field>

                            <Field orientation="horizontal">
                              <RadioGroupItem value="done" id="task-status-done" />
                              <FieldLabel htmlFor="task-status-done">Done</FieldLabel>
                            </Field>
                          </RadioGroup>
                        </FieldSet>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Priority</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FieldSet>
                          <RadioGroup
                            value={taskForm.priority}
                            onValueChange={(value) =>
                              setTaskForm((prev) => ({
                                ...prev,
                                priority: value as Task['priority'],
                              }))
                            }
                          >
                            <Field orientation="horizontal">
                              <RadioGroupItem value="Low" id="task-priority-low" />
                              <FieldLabel htmlFor="task-priority-low">Low</FieldLabel>
                            </Field>

                            <Field orientation="horizontal">
                              <RadioGroupItem value="Medium" id="task-priority-medium" />
                              <FieldLabel htmlFor="task-priority-medium">Medium</FieldLabel>
                            </Field>

                            <Field orientation="horizontal">
                              <RadioGroupItem value="High" id="task-priority-high" />
                              <FieldLabel htmlFor="task-priority-high">High</FieldLabel>
                            </Field>
                          </RadioGroup>
                        </FieldSet>
                      </CardContent>
                    </Card>
                  </div>
                ) : selectedTask ? (
                  <div className="space-y-4 px-6 pb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Goal</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {selectedTask?.goalId ? goalNameById[selectedTask.goalId] ?? 'Unknown Goal' : 'No goal'}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {selectedTask.description || 'No description provided.'}
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {selectedTask.status}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Priority</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {selectedTask.priority}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Role Required</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {selectedTask.roleRequired || 'None'}
                        </CardContent>
                      </Card>

                      

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Due Date</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {selectedTask.dueDate
                            ? new Date(selectedTask.dueDate).toLocaleDateString()
                            : 'No due date'}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedTask.tags.length > 0 ? (
                            selectedTask.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No tags</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Assigned To</CardTitle>
                      </CardHeader>

                      <CardContent>
                        {selectedTask.assignedToUserIds.length > 0 ? (
                          <div className="flex -space-x-2">
                            {selectedTask.assignedToUserIds.map((user) => {
                              const displayName =
                                user.displayName ||
                                user.profile?.displayName ||
                                user.email ||
                                'User'

                              return (
                                <NetworkAvatar
                                  key={user._id}
                                  displayName={displayName}
                                  profilePictureUrl={user.profile?.profilePictureUrl}
                                  size="sm"
                                />
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No one assigned</p>
                        )}
                      </CardContent>
                    </Card>

                    {selectedTask.status === 'done' && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Completion</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {selectedTask.completedAt
                            ? `Completed on ${new Date(selectedTask.completedAt).toLocaleDateString()}`
                            : 'Completion date not recorded'}
                          {selectedTask.completedBy
                            ? ` by ${
                                selectedTask.completedBy.displayName ||
                                selectedTask.completedBy.username ||
                                selectedTask.completedBy.email ||
                                'Unknown User'
                              }`
                            : ''}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : null }

                <div className="flex gap-2 border-t px-6 py-4">
                  {taskSheetMode === 'create' ? (
                    <>
                      <Button onClick={handleCreateTask}>
                        Create Task
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsTaskSheetOpen(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : taskSheetMode === 'edit' ? (
                    <>
                      <Button onClick={handleSaveTask}>
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!selectedTask) return
                          setTaskForm({
                            title: selectedTask.title,
                            description: selectedTask.description ?? '',
                            status: selectedTask.status,
                            priority: selectedTask.priority,
                            roleRequired: selectedTask.roleRequired ?? '',
                            dueDate: selectedTask.dueDate ? selectedTask.dueDate.slice(0, 10) : '',
                            tags: (selectedTask.tags ?? []).join(', '),
                            goalId: selectedTask.goalId ?? '',
                            assignedToUserIds: selectedTask.assignedToUserIds?.map((user) => user._id) ?? [],
                          })
                          setTaskSheetMode('view')
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                      <>
                      <Button onClick={() => setTaskSheetMode('edit')}>
                        <Pencil className="mr-2 size-4" />
                        Edit Task
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsTaskSheetOpen(false)}
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>
          </>
        </SheetContent>
      </Sheet>
    </div>
  )
}