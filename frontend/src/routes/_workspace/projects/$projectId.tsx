import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { KanbanColumn, type Column } from './components/column'
import type { Task } from './components/task'
import api from '@/api/axios'

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  loader: async ({ params }) => {
    try {
      const res = await api.get(`/api/projects/${params.projectId}/details`)
      return res.data
    } catch {
      return { project: { _id: params.projectId, name: 'Project Board', description: '' }, tasks: [] }
    }
  },
  component: ProjectBoard,
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

interface ApiResponse {
  project: { _id: string; name: string; description: string }
  tasks: ApiTask[]
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
      case 'done':        done.push(id);       break
      case 'in_progress': inProgress.push(id); break
      case 'blocked':     blocked.push(id);    break
      default:            todo.push(id)
    }
  }

  return {
    tasks,
    columns: {
      'col-1': { id: 'col-1', title: 'To Do',      taskIds: todo },
      'col-2': { id: 'col-2', title: 'In Progress', taskIds: inProgress },
      'col-3': { id: 'col-3', title: 'Blocked',     taskIds: blocked },
      'col-4': { id: 'col-4', title: 'Done',        taskIds: done },
    },
    columnOrder: ['col-1', 'col-2', 'col-3', 'col-4'],
  }
}

function ProjectBoard() {
  const loaderData = Route.useLoaderData() as ApiResponse
  const projectName        = loaderData?.project?.name        ?? 'Project Board'
  const projectDescription = loaderData?.project?.description ?? 'Drag and drop tasks to update their status.'

  const [data, setData] = useState<BoardData>(() => buildBoardData(loaderData))

  const handleDeleteTask = (columnId: string, taskId: string) => {
    const newColumnTaskIds = data.columns[columnId].taskIds.filter(id => id !== taskId)
    const newTasks = { ...data.tasks }
    delete newTasks[taskId]
    setData({ ...data, tasks: newTasks, columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: newColumnTaskIds } } })
  }

  const handleAddTask = (columnId: string, content: string) => {
    const newTaskId = `task-${Date.now()}`
    const newTask: Task = { id: newTaskId, content, priority: 'Medium' }
    setData({
      ...data,
      tasks: { ...data.tasks, [newTaskId]: newTask },
      columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: [...data.columns[columnId].taskIds, newTaskId] } },
    })
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const startColumn  = data.columns[source.droppableId]
    const finishColumn = data.columns[destination.droppableId]

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds)
      newTaskIds.splice(source.index, 1)
      newTaskIds.splice(destination.index, 0, draggableId)
      setData({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } })
      return
    }

    const startTaskIds  = Array.from(startColumn.taskIds)
    startTaskIds.splice(source.index, 1)
    const finishTaskIds = Array.from(finishColumn.taskIds)
    finishTaskIds.splice(destination.index, 0, draggableId)

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]:  { ...startColumn,  taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    })
  }

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{projectName}</h1>
        <p className="text-muted-foreground mt-2">{projectDescription}</p>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId]
            const tasks  = column.taskIds.map((id) => data.tasks[id]).filter(Boolean)
            return <KanbanColumn key={column.id} column={column} tasks={tasks} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} />
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
