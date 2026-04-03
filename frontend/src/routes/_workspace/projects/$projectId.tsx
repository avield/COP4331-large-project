import { createFileRoute } from '@tanstack/react-router'
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
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/api/authStore'

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  loader: async ({ params }) => {
    try {
      const res = await api.get(`/projects/${params.projectId}/details`)
      return res.data
    } catch {
      return { project: { 
          _id: params.projectId, 
          name: 'Project Board', 
          description: '',
          dueDate: null,
          visisbility: 'private',
          recruitingStatus: 'closed',
          lookingForRoles: [],
          tags: [],
          status: 'planning',
          allowSelfJoin: false,
          requireApprovalToJoin: true,
          createdBy: null,
          },
          members: [],
          tasks: [],
          permissions: {
            canEditProject: false,
            conJoinProject: false,
          },
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

// Shape from GET /api/projects/:projectId/details
interface ApiTask {
  _id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high'
}

interface ApiMember {
  _id: string
  projectId: string
  userId: {
    _id: string
    email?: string
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
  allowSelfJoin?: boolean
  requireApprovalToJoin?: boolean
  createdBy?: {
    _id: string
    displayName?: string
  } | null
}

interface ApiResponse {
  project: ApiProject
  members?: ApiMember[]
  tasks: ApiTask[]
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

function buildBoardData(apiData: ApiResponse): BoardData {
  const tasks: Record<string, Task> = {}
  const todo: string[] = []
  const inProgress: string[] = []
  const blocked: string[] = []
  const done: string[] = []

  for (const t of (apiData.tasks ?? [])) {
    const id = t._id
    tasks[id] = { id, content: t.title, priority: mapPriority(t.priority) }
    switch (t.status) {
      case 'done':        done.push(id);       break;
      case 'in_progress': inProgress.push(id); break;
      case 'blocked':     blocked.push(id);    break;
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
  const user = useAuthStore((state) => state.user)
  const currentUserId = user?.id
  const loaderData = Route.useLoaderData() as ApiResponse
  const members = loaderData.members ?? []
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [savedTaskId, setSavedTaskId] = useState<string | null>(null)

  const myMembership = members.find(
    (member) =>
      member.membershipStatus === 'active' &&
      member.userId?._id === currentUserId
  )

  const canEditProject =
    myMembership?.permissions?.canEditProject ?? false

  console.log('auth user', user)
  console.log('currentUserId', currentUserId)
  console.log('members', members)
  console.log('myMembership', myMembership)
  console.log('canEditProject', canEditProject)
  
  const project = loaderData.project
  
  
  const canJoinProject = !!loaderData.permissions?.canJoinProject

  const [data, setData] = useState<BoardData>(() => buildBoardData(loaderData))

  const [editForm, setEditForm] = useState({
    name: project.name ?? '',
    description: project.description ?? '',
    visibility: project.visibility ?? 'private',
    recruitingStatus: project.recruitingStatus ?? 'closed',
    status: project.status ?? 'planning',
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : '',
    tags: (project.tags ?? []).join(', '),
    lookingForRoles: (project.lookingForRoles ?? []).join(', '),
    allowSelfJoin: project.allowSelfJoin ?? false,
    requireApprovalToJoin: project.requireApprovalToJoin ?? true,
  })

  const memberPreview = useMemo(() => members.slice(0, 5), [members])

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

  const handleAddTask = (columnId: string, content: string) => {
    const newTaskId = `task-${Date.now()}`
    const newTask: Task = { id: newTaskId, content, priority: 'Medium' }

    setData({
      ...data,
      tasks: { ...data.tasks, [newTaskId]: newTask },
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          taskIds: [...data.columns[columnId].taskIds, newTaskId],
        },
      },
    })
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

  const handleSaveProject = async () => {
    // Replace with real update endpoint when ready
    // await api.put(`/projects/${project._id}`, payload)
    console.log('Save project', editForm)
  }

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
            <Sheet>
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
                      <Button onClick={handleSaveProject}>Save Changes</Button>
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </div>
                  </FieldSet>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Overview grid */}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                Core details, visibility, and recruiting information.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  {project.allowSelfJoin
                    ? 'Users can join immediately.'
                    : project.requireApprovalToJoin
                      ? 'Users must request approval to join.'
                      : 'Invite only.'}
                </div>
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
            <CardContent className="min-w-0 space-y-4">
              <AvatarGroup>
                {memberPreview.map((member) => (
                  <Avatar key={member._id}>
                    {member.userId?.avatarUrl ? (
                      <img
                        src={member.userId.avatarUrl}
                        alt={member.userId.displayName ?? member.userId.email ?? 'Member'}
                      />
                    ) : null}
                    <AvatarFallback>
                      {(member.userId?.displayName ?? member.userId?.email ?? '??')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>

              <Separator />

              <div className="space-y-3">
                {members.length > 0 ? (
                  members.map((member) => {
                    const displayName =
                      member.userId?.displayName ??
                      member.userId?.email ??
                      'Unknown User'

                    const email = member.userId?.email ?? 'No email'
                    const avatarUrl = member.userId?.avatarUrl

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} />
                            ) : null}
                            <AvatarFallback>
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

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
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )
              })}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  )
}