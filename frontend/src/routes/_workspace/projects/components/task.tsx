import { Draggable } from '@hello-pangea/dnd'
import { GripVertical, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NetworkAvatar } from '@/components/network-avatar'

type AssignedUser = {
  _id: string
  displayName?: string
  email?: string
  username?: string
  profile?: {
    displayName?: string
    profilePictureUrl?: string
  }
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  priority: 'Low' | 'Medium' | 'High'
  tags: string[]
  assignedToUserIds: AssignedUser[]
  roleRequired: string
  dueDate?: string | null
  createdAt?: string | null
  completedAt?: string | null
  completedBy?: {
    _id: string
    displayName?: string
    email?: string
    username?: string
  } | null
  createdBy?: {
    _id: string
    displayName?: string
    email?: string
    username?: string
  } | null
  goalId?: string | null
}

type KanbanTaskProps = {
  task: Task
  index: number
  goalNameById: Record<string, string>
  onDelete: () => void
  onEdit: () => void
  onClick?: () => void
}

const priorityConfig = {
  Low: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-400',
  },
  Medium: {
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-400',
  },
  High: {
    badge: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
    dot: 'bg-rose-400',
  },
} as const

export function KanbanTask({
  task,
  index,
  goalNameById,
  onDelete,
  onEdit,
  onClick,
}: KanbanTaskProps) {
  const priority = priorityConfig[task.priority]
  const hasDescription = !!task.description?.trim()
  const hasTags = (task.tags ?? []).length > 0
  const goalTitle = task.goalId ? goalNameById[task.goalId] : null

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onClick}
          className={`group relative mb-2 rounded-lg border bg-card p-3 cursor-pointer hover:scale-[1.01] transition-all duration-150 ${
            snapshot.isDragging
              ? 'rotate-1 scale-105 border-brand/30 shadow-xl shadow-black/30 ring-1 ring-brand/20'
              : 'border-border/50 hover:border-border hover:shadow-md hover:shadow-black/10 hover:bg-muted/30'
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground/60 active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-start text-left">
              <p className="pr-6 text-sm leading-snug font-medium text-foreground">
                {task.title}
              </p>

              {hasDescription && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-5">
            <span
              className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium ${priority.badge}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${priority.dot}`} />
              {task.priority}
            </span>

            {goalTitle && (
              <Badge variant="outline" className="text-[10px]">
                Goal: {goalTitle}
              </Badge>
            )}

            {task.roleRequired && (
              <Badge variant="outline" className="text-[10px]">
                {task.roleRequired}
              </Badge>
            )}

            {hasTags &&
              task.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
          </div>

          {task.assignedToUserIds?.length > 0 && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex -space-x-2">
                {task.assignedToUserIds.slice(0, 4).map((user) => {
                  const displayName =
                    user.displayName ||
                    user.profile?.displayName ||
                    user.email ||
                    'User'

                  return (
                    <div
                      key={user._id}
                      className="rounded-full ring-2 ring-background"
                      title={displayName}
                    >
                      <NetworkAvatar
                        displayName={displayName}
                        profilePictureUrl={user.profile?.profilePictureUrl}
                        size="sm"
                      />
                    </div>
                  )
                })}
              </div>

              {task.assignedToUserIds.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{task.assignedToUserIds.length - 4}
                </span>
              )}
            </div>
          )}

          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-all group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  )
}