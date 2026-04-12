import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import { DragDropContext, type DropResult, Droppable, Draggable } from "@hello-pangea/dnd"
import { CalendarDays, Lock, Globe, Users, Settings, Pencil, UserPlus, Loader2, Check, GripVertical, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { useAuthStore } from '@/api/authStore'
import { NetworkAvatar } from '@/components/network-avatar'
import { toast } from 'sonner'
import { GoalsOverviewChart } from "./components/goals-overview-chart"
import { ProjectProgressAreaChart } from "./components/area-chart"

const API_BASE_URL = import.meta.env.BACKEND_URL || 'http://localhost:5000';

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  loader: async ({ params }) => {
    const res = await api.get(`/projects/${params.projectId}/details`)

    // Backend provides 'isFullDetails' in the JSON
    return res.data
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
  id?: string
  displayName?: string
  email?: string
  username?: string
  profilePictureUrl?: string | null
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
  _id: string;
  projectId: string;
  userId?: {
    _id: string;
    email?: string;
    displayName?: string;
    profilePictureUrl?: string | null;
    profile?: {
      displayName?: string;
      profilePictureUrl?: string;
    };
  } | null;
  role: string;
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
    _id?: string
    email?: string
    profile?: {
      displayName?: string
    }
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
  status?: 'planning' | 'active' | 'on_hold' | 'completed',
  settings?: {
    allowSelfJoinRequests?: boolean
    requireApprovalToJoin?: boolean
    inviteOnly?: boolean
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
    users?: (string | ApiUserSummary)[]
) {
  const API_BASE_URL = import.meta.env.BACKEND_URL || 'http://localhost:5000';

  return (users ?? [])
      .map((user) => {
        // TypeScript now knows 'user' is either a string or an ApiUserSummary
        if (typeof user === 'string') {
          return { _id: user, displayName: '', email: '', username: '' }
        }

        // 1. Get the path safely from our Interface structure
        const rawPath = user.profile?.profilePictureUrl || user.profilePictureUrl || null;

        // 2. URL Construction
        let finalUrl = null;
        if (rawPath) {
          const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
          finalUrl = rawPath.startsWith('http') ? rawPath : `${API_BASE_URL}${cleanPath}`;
        }

        return {
          _id: (user._id || user.id || ''),
          displayName:
              user.profile?.displayName ??
              user.displayName ??
              user.email ??
              '',
          profilePictureUrl: finalUrl,
        }
      })
      .filter((user) => user._id)
}

function buildBoardData(apiData: ApiResponse): BoardData {
  // If no tasks exist (like in Visitor View), return an empty board
  if (!apiData.tasks) {
    return {
      tasks: {},
      columns: {
        'col-1': { id: 'col-1', title: 'To Do',       taskIds: [] },
        'col-2': { id: 'col-2', title: 'In Progress', taskIds: [] },
        'col-3': { id: 'col-3', title: 'Blocked',     taskIds: [] },
        'col-4': { id: 'col-4', title: 'Done',        taskIds: [] },
      },
      columnOrder: ['col-1', 'col-2', 'col-3', 'col-4'],
    }
  }
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


  const members = useMemo(() => {
    const rawMembers = loaderData.members ?? [];

    return rawMembers.map((m) => {
      // 1. Extract the nested path
      const rawPath = m.userId?.profile?.profilePictureUrl || m.userId?.profilePictureUrl;

      // 2. Build the full URL
      const finalUrl = rawPath
          ? (rawPath.startsWith('http') ? rawPath : `${API_BASE_URL}${rawPath}`)
          : undefined;

      // 3. FLATTEN the object so profilePictureUrl is at the top level of userId
      return {
        ...m,
        userId: m.userId ? {
          ...m.userId,
          // We explicitly set this so the Avatar component sees it
          profilePictureUrl: finalUrl
        } : null
      };
    });
  }, [loaderData.members]);

  const [orderedGoals, setOrderedGoals] = useState<ApiGoal[]>(() => loaderData.goals ?? [])

  useEffect(() => {
    setOrderedGoals(loaderData.goals ?? [])
  }, [loaderData.goals])

  const goals = orderedGoals

  // Main Project State
  const [data, setData] = useState<BoardData>(() => buildBoardData(loaderData))

  // INITIAL FORM STATE
  // This runs once when the component first mounts.
  const [editForm, setEditForm] = useState(() => ({
    name: project?.name ?? '',
    description: project?.description ?? '',
    visibility: project?.visibility ?? 'private',
    recruitingStatus: project?.recruitingStatus ?? 'closed',
    status: project?.status ?? 'planning',
    dueDate: project?.dueDate ? project.dueDate.slice(0, 10) : '',
    tags: (project?.tags ?? []).join(', '),
    lookingForRoles: (project?.lookingForRoles ?? []).join(', '),
    allowSelfJoin: project?.settings?.allowSelfJoinRequests ?? false,
    requireApprovalToJoin: project?.settings?.requireApprovalToJoin ?? false,
    inviteOnly: project?.settings?.inviteOnly ?? (project?.visibility === 'private'),
  }))

  // RE-SYNC
  // This runs whenever you switch projects (e.g., clicking a new search result).
  useEffect(() => {
    setEditForm({
      name: project?.name ?? '',
      description: project?.description ?? '',
      visibility: project?.visibility ?? 'private',
      recruitingStatus: project?.recruitingStatus ?? 'closed',
      status: project?.status ?? 'planning',
      dueDate: project?.dueDate ? project.dueDate.slice(0, 10) : '',
      tags: (project?.tags ?? []).join(', '),
      lookingForRoles: (project?.lookingForRoles ?? []).join(', '),
      allowSelfJoin: project?.settings?.allowSelfJoinRequests ?? false,
      requireApprovalToJoin: project?.settings?.requireApprovalToJoin ?? false,
      inviteOnly: project?.settings?.inviteOnly ?? (project?.visibility === 'private'),
    })

    // Re-sync the Kanban board data
    setData(buildBoardData(loaderData))
  }, [project, loaderData])

  // UI Visibility States
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false)
  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(false)
  const [isGoalDeleteDialogOpen, setIsGoalDeleteDialogOpen] = useState(false)
  const [isTaskDeleteDialogOpen, setIsTaskDeleteDialogOpen] = useState(false)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [taskDeleteError, setTaskDeleteError] = useState('')
  const isPrivateProject = editForm.visibility === 'private'

  //Member management UI States
  const [isManageMembersSheetOpen, setIsManageMembersSheetOpen] = useState(false)
  const [manageableMembers, setManageableMembers] = useState<ApiMember[]>([])
  const [isLoadingManageableMembers, setIsLoadingManageableMembers] = useState(false)

  const [memberSearch, setMemberSearch] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<ApiUserSummary[]>([])
  const [selectedInviteeId, setSelectedInviteeId] = useState('')
  const [inviteRole, setInviteRole] = useState('Member')
  const [isInvitingMember, setIsInvitingMember] = useState(false)

  // Mode & Selection States
  const [taskSheetMode, setTaskSheetMode] = useState<'view' | 'edit' | 'create'>('view')
  const [goalSheetMode, setGoalSheetMode] = useState<'create' | 'edit'>('create')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<ApiGoal | null>(null)
  const [createTaskColumnId, setCreateTaskColumnId] = useState<string | null>(null)
  const [goalFilter, setGoalFilter] = useState<string>('all')

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
  const [isReorderingGoals, setIsReorderingGoals] = useState(false)

  // Permission & Membership Logic
  const myMembership = useMemo(() => members.find(
      (m) => m.membershipStatus === 'active' && m.userId?._id === currentUserId
  ), [members, currentUserId])

  // Find the specific record for the current user
  const myPendingRecord = useMemo(() =>
          members.find(m => m.membershipStatus === 'pending' && m.userId?._id === currentUserId),
      [members, currentUserId]
  );

  // Determine if YOU started it (a Request)
  const isMyPendingRequest = useMemo(() => {
    if (!myPendingRecord) return false;

    // Handle both populated object and plain ID string
    const inviterId = typeof myPendingRecord.joinedBy === 'object'
        ? myPendingRecord.joinedBy?._id
        : myPendingRecord.joinedBy;

    return inviterId === currentUserId;
  }, [myPendingRecord, currentUserId]);

  // 3. Determine if someone ELSE started it (an Invitation)
  const isPendingInviteToMe = !!myPendingRecord && !isMyPendingRequest;

  const canEditProject = myMembership?.permissions?.canEditProject ?? false
  const canJoinProject = !!loaderData.permissions?.canJoinProject
  const canManageMembers = myMembership?.role === 'Owner' || myMembership?.permissions?.canManageMembers === true

  // Find your membership status
  const myRequest = useMemo(() =>
          members.find(m => m.userId?._id === currentUserId),
      [members, currentUserId]
  );

  const isPending = myRequest?.membershipStatus === 'pending';

  // FOR DEBUGGING
  console.log("Current Members List:", members);
  console.log("Am I pending?:", isPending);

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

  //Filter the kanban board by Goals
  const filteredBoardData = useMemo(() => {
    if (goalFilter === 'all') return data

    const filteredTasks = Object.fromEntries(
      Object.entries(data.tasks).filter(([, task]) => {
        if (goalFilter === 'ungrouped') {
          return !task.goalId
        }

        return task.goalId === goalFilter
      })
    )

    return {
      ...data,
      columns: Object.fromEntries(
        Object.entries(data.columns).map(([columnId, column]) => [
          columnId,
          {
            ...column,
            taskIds: column.taskIds.filter((taskId) => filteredTasks[taskId]),
          },
        ])
      ),
      tasks: filteredTasks,
    }
  }, [data, goalFilter])

  //  *************************
  //  Member Add/Invite/Remove
  //  *************************

  //Fetch members
  useEffect(() => {
    const loadManageableMembers = async () => {
      if (!isManageMembersSheetOpen || !canManageMembers) return

      try {
        setIsLoadingManageableMembers(true)
        const res = await api.get(`/project-members/project/${project._id}/manage`)
        setManageableMembers(res.data ?? [])
      } catch (error) {
        console.error('Failed to load manageable members:', error)
        toast.error('Failed to load member management data.')
      } finally {
        setIsLoadingManageableMembers(false)
      }
    }

    void loadManageableMembers()
  }, [isManageMembersSheetOpen, canManageMembers, project._id])

  //Helper to search for users
  const handleSearchUsers = async (value: string) => {
    setMemberSearch(value)

    const trimmed = value.trim()
    if (!trimmed) {
      setMemberSearchResults([])
      return
    }

    try {
      const res = await api.get('/search', {
        params: { q: trimmed, type: 'users' },
      })

      const users = res.data?.results?.users ?? []
      setMemberSearchResults(users)
    } catch (error) {
      console.error('Failed to search users:', error)
    }
  }

  //Send invitations
  const handleInviteMember = async () => {
    if (!selectedInviteeId) return

    try {
      setIsInvitingMember(true)

      await api.post(`/project-members/project/${project._id}`, {
        userId: selectedInviteeId,
        role: inviteRole,
        permissions: {
          canEditProject: false,
          canManageMembers: false,
          canCreateTasks: true,
          canAssignTasks: false,
          canCompleteAnyTask: false,
          canModerateChat: false,
        },
      })

      toast.success('Invitation sent.')
      setSelectedInviteeId('')
      setMemberSearch('')
      setMemberSearchResults([])

      const refreshed = await api.get(`/project-members/project/${project._id}/manage`)
      setManageableMembers(refreshed.data ?? [])
      await router.invalidate()
    } catch (error) {
      console.error('Failed to invite member:', error)
      toast.error('Failed to send invitation.')
    } finally {
      setIsInvitingMember(false)
    }
  }

  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleJoinRequest = async () => {
    if (isProcessing) return; // Prevent double-clicks
    setIsProcessing(true);

    try {
      if (isPending) {
        // Use the membership ID from your myRequest memo
        await api.delete(`/project-members/${myRequest?._id}/reject`);
        toast.success("Request cancelled.");
      } else {
        await api.post(`/project-members/project/${project._id}/join`);
        toast.success("Request sent!");
      }

      // This is the most important part: tell the router to get fresh data
      await router.invalidate();
    } catch (err: unknown) {
      console.error("Action failed:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptInvite = async (membershipId?: string) => {
    if (!membershipId || isProcessing) return;
    setIsProcessing(true);
    try {
      await api.post(`/project-members/${membershipId}/accept`);
      toast.success("Welcome to the project!");
      await router.invalidate();
    } catch (err: unknown) {
      console.error("Accept failed:", err);
      toast.error("Failed to accept invitation.");
    } finally {
      setIsProcessing(true); // Keep processing true to trigger the loader/refresh
      setIsProcessing(false);
    }
  };

  const handleRejectInvite = async (membershipId?: string) => {
    if (!membershipId || isProcessing) return;
    setIsProcessing(true);
    try {
      // Uses the same 'reject' route for both cancelling a request and declining an invite
      await api.delete(`/project-members/${membershipId}/reject`);
      toast.success("Invitation declined.");
      await router.invalidate();
    } catch (err: unknown) {
      console.error("Reject failed:", err);
      toast.error("Failed to decline invitation.");
    } finally {
      setIsProcessing(false);
    }
  };

  //Approve requests, edit permissions, uninvite
  const handleUpdateMember = async (
    membershipId: string,
    updates: Partial<Pick<ApiMember, 'role' | 'membershipStatus'>> & {
      permissions?: ApiMember['permissions']
    }
  ) => {
    try {
      await api.put(`/project-members/${membershipId}`, updates)

      const refreshed = await api.get(`/project-members/project/${project._id}/manage`)
      setManageableMembers(refreshed.data ?? [])
      await router.invalidate()

      toast.success('Member updated.')
    } catch (error) {
      console.error('Failed to update member:', error)
      toast.error('Failed to update member.')
    }
  }

  
  // ********************
  // TASK CRUD OPERATIONS
  // ********************
  
  const removeTaskFromBoard = (taskId: string) => {
    const columnId = statusToColumnId(data.tasks[taskId]?.status ?? 'todo')
    const newColumnTaskIds = data.columns[columnId].taskIds.filter((id) => id !== taskId)
    const newTasks = { ...data.tasks }
    delete newTasks[taskId]

    setData((prev) => ({
      ...prev,
      tasks: newTasks,
      columns: {
        ...prev.columns,
        [columnId]: {
          ...prev.columns[columnId],
          taskIds: newColumnTaskIds,
        },
      },
    }))
  }

  const handleDeleteTask = async (task?: Task | null) => {
    const taskToDelete = task ?? selectedTask
    if (!taskToDelete) return

    try {
      setTaskDeleteError('')
      setIsDeletingTask(true)

      await api.delete(`/tasks/${taskToDelete.id}`)

      removeTaskFromBoard(taskToDelete.id)

      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null)
        setIsTaskSheetOpen(false)
      }

      setIsTaskDeleteDialogOpen(false)
      toast.success('Task deleted successfully.')
    } catch (error) {
      console.error('Failed to delete task:', error)
      setTaskDeleteError('Failed to delete task. Please try again.')
      toast.error('Failed to delete task.')
    } finally {
      setIsDeletingTask(false)
    }
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

  const openTaskView = (task: Task) => {
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
      assignedToUserIds:
        task.assignedToUserIds?.map((user) => (typeof user === 'string' ? user : user._id)).filter(Boolean) ?? [],
    })
    setTaskSheetMode('view')
    setIsTaskSheetOpen(true)
  }

  const openTaskEdit = (task: Task) => {
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
      assignedToUserIds:
        task.assignedToUserIds?.map((user) => (typeof user === 'string' ? user : user._id)).filter(Boolean) ?? [],
    })
    setTaskSheetMode('edit')
    setIsTaskSheetOpen(true)
  }

  const openTaskDeleteDialog = (task: Task) => {
    setSelectedTask(task)
    setTaskDeleteError('')
    setIsTaskDeleteDialogOpen(true)
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
    if (!selectedGoal) return;

    try {
      setGoalError('');
      setIsDeletingGoal(true);

      // Backend Call: Pass the action as a query parameter
      await api.delete(`/goals/${selectedGoal._id}`, {
        params: { taskAction }
      });

      // Local State Sync: Update the BoardData directly
      setData((prev) => {
        const nextTasks = { ...prev.tasks };
        const nextColumns = { ...prev.columns };

        if (taskAction === 'delete') {
          // Find tasks tied to this goal and remove them from everywhere
          Object.keys(nextTasks).forEach((taskId) => {
            if (nextTasks[taskId].goalId === selectedGoal._id) {
              const colId = statusToColumnId(nextTasks[taskId].status);
              nextColumns[colId].taskIds = nextColumns[colId].taskIds.filter(id => id !== taskId);
              delete nextTasks[taskId];
            }
          });
        } else {
          // Just remove the goalId reference so they become "Ungrouped"
          Object.keys(nextTasks).forEach((taskId) => {
            if (nextTasks[taskId].goalId === selectedGoal._id) {
              nextTasks[taskId].goalId = null;
            }
          });
        }

        return {
          ...prev,
          tasks: nextTasks,
          columns: nextColumns
        };
      });

      // UI Cleanup
      await router.invalidate(); // Keeps the 'goals' list in sync with the database
      setIsGoalDeleteDialogOpen(false);
      setIsGoalSheetOpen(false);
      setSelectedGoal(null);
      toast.success(taskAction === 'delete' ? "Goal and tasks removed." : "Goal removed; tasks unassigned.");

    } catch (error) {
      console.error('Goal deletion failed:', error);
      toast.error('Could not delete goal. Please try again.');
    } finally {
      setIsDeletingGoal(false);
    }
  };

    
  const handleGoalDragEnd = async (result: DropResult) => {
    const { destination, source } = result

    if (!destination) return
    if (destination.droppableId !== source.droppableId) return
    if (destination.index === source.index) return

    const previousGoals = [...goals]
    const nextGoals = Array.from(goals)
    const [movedGoal] = nextGoals.splice(source.index, 1)
    nextGoals.splice(destination.index, 0, movedGoal)

    const reorderedGoals = nextGoals.map((goal, index) => ({
      ...goal,
      order: index,
    }))

    setOrderedGoals(reorderedGoals)
    setIsReorderingGoals(true)

    try {
      await Promise.all(
        reorderedGoals.map((goal) =>
          api.put(`/goals/${goal._id}`, { order: goal.order })
        )
      )

      await router.invalidate()
      toast.success('Goals reordered successfully.')
    } catch (error) {
      console.error('Failed to reorder goals:', error)
      setOrderedGoals(previousGoals)
      toast.error('Failed to reorder goals.')
    } finally {
      setIsReorderingGoals(false)
    }
  }


  //  ************************
  //  PROJECT CRUD OPERATIONS
  //  ************************

  const handleSaveProject = async () => {
    try {
      setProjectSaveError('')
      setIsSavingProject(true)

      const isPrivateProject = editForm.visibility === 'private'

      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        visibility: editForm.visibility,
        recruitingStatus: isPrivateProject ? 'closed' : editForm.recruitingStatus,
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
          allowSelfJoinRequests: isPrivateProject ? false : editForm.allowSelfJoin,
          requireApprovalToJoin: isPrivateProject ? false : editForm.requireApprovalToJoin,
          inviteOnly: isPrivateProject ? true : editForm.inviteOnly,
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

    await navigate({ to: '/home' })
  } catch (error) {
    console.error('Failed to delete project:', error)
    setDeleteProjectError('Failed to delete project. Please try again.')
    toast.error('Failed to delete project.')
  } finally {
    setIsDeletingProject(false)
  }
}

// VISITOR VIEW
  if (!isFullDetails) {
    // Determine the text and visual state of the main button
    const isAutoJoin = project.settings?.allowSelfJoinRequests && !project.settings?.requireApprovalToJoin;

    let buttonLabel;
    if (isProcessing) {
      buttonLabel = <Loader2 className="animate-spin h-4 w-4" />;
    } else if (isMyPendingRequest) {
      buttonLabel = "Cancel Request to Join";
    } else if (isAutoJoin) {
      // If no approval is needed, it's a direct action
      buttonLabel = "Join Project";
    } else if (editForm.inviteOnly) {
      buttonLabel = <><Lock className="mr-2 h-4 w-4" /> Invite Only</>;
    } else {
      buttonLabel = "Request to Join";
    }

    return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="bg-muted p-4 rounded-full mb-6">
            <Lock className="size-8 text-muted-foreground" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>

          <p className="text-muted-foreground mt-2 max-w-md">
            {project.description || "This workspace is currently private."}
          </p>

          <div className="flex flex-col gap-2 mt-8 w-full max-w-xs">
            <Button
                size="lg"
                className="w-full"
                // We use isMyPendingRequest directly here instead of the unused variable
                variant={isMyPendingRequest ? "destructive" : "default"}
                disabled={(editForm.inviteOnly && !isMyPendingRequest) || isProcessing}
                onClick={handleToggleJoinRequest}
            >
              {buttonLabel}
            </Button>

            {editForm.inviteOnly && !isMyPendingRequest && !isPendingInviteToMe && (
                <p className="text-xs text-muted-foreground mt-2">
                  This project is currently invite-only.
                </p>
            )}

            {/* This card only shows if SOMEONE ELSE invited you */}
            {isPendingInviteToMe && (
                <Card className="mt-6 border-primary/20 bg-primary/5">
                  <CardHeader className="p-4 pb-2 text-left">
                    <CardTitle className="text-sm font-semibold">You've been invited!</CardTitle>
                    <CardDescription className="text-xs">
                      An owner has invited you to join this team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex gap-2">
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAcceptInvite(myPendingRecord?._id)}
                    >
                      Accept
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectInvite(myPendingRecord?._id)}
                    >
                      Decline
                    </Button>
                  </CardContent>
                </Card>
            )}
          </div>
        </div>
    );
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

          {/* PROJECT TASK SHEET */}
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
                          setEditForm((prev) => {
                            const nextVisibility = value as 'public' | 'private'

                            if (nextVisibility === 'private') {
                              return {
                                ...prev,
                                visibility: nextVisibility,
                                recruitingStatus: 'closed',
                                allowSelfJoin: false,
                                requireApprovalToJoin: false,
                                inviteOnly: true,
                              }
                            }

                            return {
                              ...prev,
                              visibility: nextVisibility,
                              allowSelfJoin: true,
                              requireApprovalToJoin: true,
                              inviteOnly: false,
                            }
                          })
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
                      {isPrivateProject && (
                        <p className="text-sm text-muted-foreground">
                          Private projects are automatically closed to new members.
                        </p>
                      )}
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
                          <RadioGroupItem value="open" id="recruiting-open" disabled={isPrivateProject} />
                          <FieldLabel htmlFor="recruiting-open">Open to new members</FieldLabel>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="closed" id="recruiting-closed" disabled={isPrivateProject} />
                          <FieldLabel htmlFor="recruiting-closed">Closed</FieldLabel>
                        </Field>
                      </RadioGroup>
                    </FieldSet>

                    <FieldSet>
                      <FieldLegend>Project status</FieldLegend>
                      <RadioGroup
                        value={editForm.status}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: value as 'planning' | 'active' | 'on_hold' | 'completed',
                          }))
                        }
                      >
                        <Field orientation="horizontal">
                          <RadioGroupItem value="planning" id="project-status-planning" />
                          <FieldLabel htmlFor="project-status-planning">Planning</FieldLabel>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="active" id="project-status-active" />
                          <FieldLabel htmlFor="project-status-active">Active</FieldLabel>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="on_hold" id="project-status-on-hold" />
                          <FieldLabel htmlFor="project-status-on-hold">On Hold</FieldLabel>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem value="completed" id="project-status-completed" />
                          <FieldLabel htmlFor="project-status-completed">Completed</FieldLabel>
                        </Field>
                      </RadioGroup>
                    </FieldSet>

                    <FieldSet>
                      <FieldLegend>Join settings</FieldLegend>
                      {isPrivateProject && (
                        <p className="text-sm text-muted-foreground">
                          Private projects are invite only.
                        </p>
                      )}

                      <RadioGroup
                        value={
                          editForm.inviteOnly
                            ? 'invite_only'
                            : editForm.requireApprovalToJoin
                              ? 'approval'
                              : 'self_join'
                        }
                        onValueChange={(value) =>
                          setEditForm((prev) => ({
                            ...prev,
                            allowSelfJoin: value !== 'invite_only',
                            requireApprovalToJoin: value === 'approval',
                            inviteOnly: value === 'invite_only',
                          }))
                        }
                      >
                        <Field orientation="horizontal">
                          <RadioGroupItem
                            value="self_join"
                            id="join-self"
                            disabled={isPrivateProject}
                          />
                          <FieldContent>
                            <FieldLabel htmlFor="join-self">Self join</FieldLabel>
                            <FieldDescription>
                              Users can join immediately.
                            </FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem
                            value="approval"
                            id="join-approval"
                            disabled={isPrivateProject}
                          />
                          <FieldContent>
                            <FieldLabel htmlFor="join-approval">Require approval</FieldLabel>
                            <FieldDescription>
                              Users can request to join and wait for approval.
                            </FieldDescription>
                          </FieldContent>
                        </Field>

                        <Field orientation="horizontal">
                          <RadioGroupItem
                            value="invite_only"
                            id="join-invite-only"
                            disabled={isPrivateProject}
                          />
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

            {/* PROGRESS BAR */}
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

          {/* GOAL RADIAL CHART */}
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

                {isReorderingGoals && (
                  <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Saving goal order...
                  </div>
                )}


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
                  <div className="w-full overflow-hidden">
                    <GoalsOverviewChart data={goalChartData}/>
                  </div>
                )}

                {/* GOALS STATUS AND LIST */}
                {goalProgress.length > 0 ? (
                  <DragDropContext onDragEnd={handleGoalDragEnd}>
                    <CardDescription>
                      Drag goals to reorder the rings from the center outward.
                    </CardDescription>
                    <div className="max-h-[420px] overflow-y-auto pr-2">
                      <Droppable droppableId="goals-droppable">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-3"
                          >
                            {goalProgress.map((goal, index) => (
                              <Draggable key={goal._id} draggableId={goal._id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`rounded-lg border p-4 transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg ring-1 ring-primary/20' : ''
                                    }`}
                                  >
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3">
                                        <div
                                          {...provided.dragHandleProps}
                                          className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                                        >
                                          <GripVertical className="size-4" />
                                        </div>

                                        <div>
                                          <div className="text-sm font-medium">{goal.title}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {goal.total > 0
                                              ? `${goal.done}/${goal.total} tasks complete`
                                              : 'No tasks assigned yet'}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        {goal.hasInProgress && <Badge variant="secondary">In Progress</Badge>}
                                        {goal.hasBlocked && <Badge variant="destructive">Blocked</Badge>}
                                        {canEditProject && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedGoal(goal)
                                                setGoalSheetMode('edit')
                                                setGoalError('')
                                                setGoalForm({
                                                  title: goal.title,
                                                  description: goal.description ?? '',
                                                })
                                                setIsGoalSheetOpen(true)
                                              }}
                                            >
                                              Edit
                                            </Button>

                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => {
                                                setSelectedGoal(goal)
                                                setIsGoalDeleteDialogOpen(true)
                                              }}
                                            >
                                              Delete
                                            </Button>
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
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </DragDropContext>
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

        {/* JOIN SETTINGS */}
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
                  {project.settings?.inviteOnly ? 'Invite only.' 
                    : project.settings?.requireApprovalToJoin
                      ? 'Users can request to join and wait for approval.'
                      : 'Users can join immediately.'}
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

          {/* MEMBERS CARD */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  Current project members and roles.
                </CardDescription>
              </div>

              {canManageMembers && (
                <Button
                  size="sm"
                  onClick={() => setIsManageMembersSheetOpen(true)}
                >
                  Manage Members
                </Button>
              )}
            </CardHeader>
            <CardContent className="min-w-0 max-h-[420px] space-y-4 overflow-y-auto pr-2">
              <AvatarGroup>
                {memberPreview.map((member) => {
                  const userSummary = member.userId;
                  const displayName = userSummary?.profile?.displayName ?? userSummary?.displayName ?? 'User';

                  return (
                      <NetworkAvatar
                          key={member._id}
                          profilePictureUrl={userSummary?.profilePictureUrl ?? undefined}
                          displayName={displayName}
                          size="sm"
                      />
                  );
                })}
                {members.length > 5 && (
                    <AvatarGroupCount>+{members.length - 5}</AvatarGroupCount>
                )}
              </AvatarGroup>

              <Separator />

              <div className="space-y-3">
                {members.length > 0 ? (
                    members.map((member: ApiMember) => {
                      const displayName = member.userId?.profile?.displayName ??
                          member.userId?.displayName ?? 'Unknown User';
                      const email = member.userId?.email ?? 'No email';

                      const isMe = member.userId?._id === user?.id
                      const rawPath = isMe
                          ? user?.profile?.profilePictureUrl
                          : (member.userId?.profile?.profilePictureUrl || member.userId?.profilePictureUrl);

                      const API_BASE_URL = import.meta.env.BACKEND_URL || 'http://localhost:5000';

                      const finalAvatarUrl = rawPath
                          ? (rawPath.startsWith('http') ? rawPath : `${API_BASE_URL}${rawPath}`)
                          : undefined;

                      return (
                          <div
                              key={member._id}
                              className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <NetworkAvatar
                                  displayName={displayName}
                                  profilePictureUrl={finalAvatarUrl}
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
                      ); // Ensure this semicolon is here
                    }) // Ensure this closing paren matches .map(
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Project Board</CardTitle>
              <CardDescription>
                Drag and drop tasks to update their status.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:mw-[300px]">
              <div className="flex items-center gap-2">
                <label htmlFor="goal-filter" className="text-sm text-muted-foreground">
                  Filter by goal
                </label>
                <select
                  id="goal-filter"
                  value={goalFilter}
                  onChange={(e) => setGoalFilter(e.target.value)}
                  className="h-9 w-full sm:w-[180px] rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="ungrouped">No Goal</option>
                  {goals.map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className='w-full sm:w-[110px] flex justify-end'>
                {goalFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={goalFilter === 'all'}
                    onClick={() => setGoalFilter('all')}
                    className='w-full sm:w-auto'
                  >
                    Clear
                  </Button>
                )}
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
          </div>
        </CardHeader>

        <CardContent className="max-w-full overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex w-max min-w-full gap-6 pb-4">
              {filteredBoardData.columnOrder.map((columnId, index) => {
                const column = filteredBoardData.columns[columnId]
                const tasks = column.taskIds.map((id) => filteredBoardData.tasks[id]).filter(Boolean)

                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    columnIndex={index}
                    tasks={tasks}
                    goalNameById={goalNameById}
                    onAddTask={handleAddTask}
                    onDeleteTask={openTaskDeleteDialog}
                    onEditTask={openTaskEdit}
                    onTaskClick={openTaskView}
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
            setSelectedGoal(null)
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
            <AlertDialogTitle>
              Delete goal{selectedGoal ? ` "${selectedGoal.title}"` : ''}?
            </AlertDialogTitle>
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

      <AlertDialog open={isTaskDeleteDialogOpen} onOpenChange={setIsTaskDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete task{selectedTask ? ` "${selectedTask.title}"` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {taskDeleteError ? (
            <p className="text-sm text-destructive">{taskDeleteError}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTask}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteTask()
              }}
              disabled={isDeletingTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingTask ? 'Deleting...' : 'Delete Task'}
            </AlertDialogAction>
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
                      <Button
                        variant="destructive"
                        type="button"
                        onClick={() => {
                          setTaskDeleteError('')
                          setIsTaskDeleteDialogOpen(true)
                        }}
                        disabled={isDeletingTask}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Task
                      </Button>
                    </>
                  ) : (
                      <>
                      <Button onClick={() => selectedTask && openTaskEdit(selectedTask)}>
                        <Pencil className="mr-2 size-4" />
                        Edit Task
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => {
                          setTaskDeleteError('')
                          setIsTaskDeleteDialogOpen(true)
                        }}
                        disabled={isDeletingTask}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete Task
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

      {/* MANAGE MEMBERS SHEET */}
      <Sheet
        open={isManageMembersSheetOpen}
        onOpenChange={(open) => {
          setIsManageMembersSheetOpen(open)
          if (!open) {
            setMemberSearch('')
            setMemberSearchResults([])
            setSelectedInviteeId('')
          }
        }}
      >
        <SheetContent className="overflow-y-auto p-0 sm:max-w-2xl">
          <>
            <SheetHeader className="px-6 pt-6">
              <SheetTitle>Manage Members</SheetTitle>
              <SheetDescription>
                Invite members, review pending invitations, and update permissions.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 px-6 pb-6">
              {/* Invite section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invite People</CardTitle>
                  <CardDescription>
                    Search by name or email and send a project invitation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <FieldSet>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="member-search">Search users</FieldLabel>
                        <Input
                          id="member-search"
                          placeholder="Search by name or email"
                          value={memberSearch}
                          onChange={(e) => void handleSearchUsers(e.target.value)}
                        />
                      </Field>

                      {memberSearchResults.length > 0 && (
                        <div className="max-h-56 overflow-y-auto rounded-md border">
                          {memberSearchResults.map((result) => {
                            const candidateId = result.id ?? result._id ?? ''
                            const displayName =
                              result.displayName ??
                              result.profile?.displayName ??
                              result.email ??
                              'Unknown User'

                            const isSelected = selectedInviteeId === candidateId

                            return (
                              <button
                                key={candidateId}
                                type="button"
                                onClick={() => setSelectedInviteeId(candidateId)}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted ${
                                  isSelected ? 'bg-muted' : ''
                                }`}
                              >
                                <div>
                                  <div className="font-medium">{displayName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {result.email ?? 'No email'}
                                  </div>
                                </div>

                                {isSelected && (
                                  <Badge variant="secondary">Selected</Badge>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <Field>
                        <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                        <Input
                          id="invite-role"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          placeholder="Member"
                        />
                      </Field>
                    </FieldGroup>
                  </FieldSet>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => void handleInviteMember()}
                      disabled={!selectedInviteeId || isInvitingMember}
                    >
                      {isInvitingMember ? 'Sending...' : 'Send Invitation'}
                    </Button>

                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setMemberSearch('')
                        setMemberSearchResults([])
                        setSelectedInviteeId('')
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current + pending members */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Members & Invitations</CardTitle>
                  <CardDescription>
                    Active members, pending invitations, and permission controls.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {isLoadingManageableMembers ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading members...
                    </div>
                  ) : manageableMembers.length > 0 ? (
                    manageableMembers.map((member) => {
                      const displayName =
                        member.userId?.profile?.displayName ??
                        member.userId?.displayName ??
                        member.userId?.email ??
                        'Unknown User'

                      const email = member.userId?.email ?? 'No email'
                      const avatarUrl = member.userId?.profile?.profilePictureUrl
                      const isPending = member.membershipStatus === 'pending'
                      const isOwner = member.role === 'Owner'
                      const joinedById = member.joinedBy?._id ?? ''
                      const memberUserId = member.userId?._id ?? ''
                      const isJoinRequest = isPending && joinedById === memberUserId
                      const isInvitation = isPending && joinedById !== memberUserId

                      return (
                        <div key={member._id} className="rounded-lg border p-4 space-y-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <NetworkAvatar
                                displayName={displayName}
                                profilePictureUrl={avatarUrl}
                                size="sm"
                              />

                              <div>
                                <div className="text-sm font-medium">{displayName}</div>
                                <div className="text-xs text-muted-foreground">{email}</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{member.role}</Badge>
                              <Badge variant={isPending ? 'secondary' : 'default'}>
                                {isPending ? 'Pending' : 'Active'}
                              </Badge>
                            </div>
                          </div>

                          {isJoinRequest ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  void handleUpdateMember(member._id, {
                                    membershipStatus: 'active',
                                  })
                                }
                              >
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    await api.delete(`/project-members/${member._id}/deny`)
                                    const refreshed = await api.get(`/project-members/project/${project._id}/manage`)
                                    setManageableMembers(refreshed.data ?? [])
                                    await router.invalidate()
                                    toast.success('Invitation or request removed.')
                                  } catch (error) {
                                    console.error('Failed to deny/remove pending member:', error)
                                    toast.error('Failed to remove pending member.')
                                  }
                                }}
                              >
                                Deny
                              </Button>
                            </div>
                          ) : isInvitation ? (
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                Invitation sent. Waiting for this user to accept or reject.
                              </div>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    await api.delete(`/project-members/${member._id}`)
                                    const refreshed = await api.get(`/project-members/project/${project._id}/manage`)
                                    setManageableMembers(refreshed.data ?? [])
                                    await router.invalidate()
                                    toast.success('Invitation cancelled.')
                                  } catch (error) {
                                    console.error('Failed to cancel invitation:', error)
                                    toast.error('Failed to cancel invitation.')
                                  }
                                }}
                              >
                                Cancel Invitation
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {!isOwner && (
                                <>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canEditProject}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canEditProject: !member.permissions.canEditProject,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can edit project</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canManageMembers}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canManageMembers: !member.permissions.canManageMembers,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can manage members</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canCreateTasks}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canCreateTasks: !member.permissions.canCreateTasks,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can create tasks</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canAssignTasks}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canAssignTasks: !member.permissions.canAssignTasks,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can assign tasks</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canCompleteAnyTask}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canCompleteAnyTask: !member.permissions.canCompleteAnyTask,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can complete any task</span>
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={member.permissions.canModerateChat}
                                        onChange={() =>
                                          void handleUpdateMember(member._id, {
                                            permissions: {
                                              ...member.permissions,
                                              canModerateChat: !member.permissions.canModerateChat,
                                            },
                                          })
                                        }
                                      />
                                      <span>Can moderate chat</span>
                                    </label>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={async () => {
                                        try {
                                          await api.delete(`/project-members/${member._id}`)
                                          const refreshed = await api.get(`/project-members/project/${project._id}/manage`)
                                          setManageableMembers(refreshed.data ?? [])
                                          await router.invalidate()
                                          toast.success('Member removed.')
                                        } catch (error) {
                                          console.error('Failed to remove member:', error)
                                          toast.error('Failed to remove member.')
                                        }
                                      }}
                                    >
                                      Remove Member
                                    </Button>
                                  </div>
                                </>
                              )}

                              {isOwner && (
                                <div className="text-sm text-muted-foreground">
                                  Owner permissions cannot be modified here.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No members or invitations found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        </SheetContent>
      </Sheet>
      {/* GOAL DELETE DIALOG */}
      <AlertDialog open={isGoalDeleteDialogOpen} onOpenChange={setIsGoalDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal: {selectedGoal?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to handle the tasks associated with this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => {
              setIsGoalDeleteDialogOpen(false);
              setSelectedGoal(null);
            }}>
              Cancel
            </AlertDialogCancel>

            <Button
                variant="secondary"
                disabled={isDeletingGoal}
                onClick={() => handleDeleteGoal('unassign')}
            >
              {isDeletingGoal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Unassign Tasks
            </Button>

            <Button
                variant="destructive"
                disabled={isDeletingGoal}
                onClick={() => handleDeleteGoal('delete')}
            >
              {isDeletingGoal && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Goal & Tasks
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}