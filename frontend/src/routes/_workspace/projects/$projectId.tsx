import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type Column } from './components/column';
import type { Task } from './components/task';

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  loader: async ({ params }) => {
    const res = await fetch(
      `${import.meta.env.BACKEND_URL}/api/projects/${params.projectId}/details`,
      { credentials: 'include' },
    )
    if (!res.ok) throw new Error('Failed to load project')
    return res.json()
  },
  component: ProjectBoard,
})

export type BoardData = {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
};

// Transform API response into board data.
// Adjust field names here if your backend shape differs.
function buildBoardData(data: Record<string, unknown>): BoardData {
  // If the backend already returns board-shaped data, use it directly
  if (data.columns && data.columnOrder) {
    return data as unknown as BoardData
  }

  // Otherwise build default columns from a flat tasks array
  const rawTasks: Array<{ _id: string; content?: string; title?: string; priority?: string; status?: string }> =
    (data.tasks as Array<{ _id: string; content?: string; title?: string; priority?: string; status?: string }>) ?? []

  const tasks: Record<string, Task> = {}
  const todo: string[] = []
  const inProgress: string[] = []
  const done: string[] = []

  for (const t of rawTasks) {
    const id = t._id
    tasks[id] = {
      id,
      content: t.content ?? t.title ?? 'Untitled task',
      priority: (t.priority as Task['priority']) ?? 'Medium',
    }
    if (t.status === 'done' || t.status === 'completed') {
      done.push(id)
    } else if (t.status === 'in-progress' || t.status === 'inProgress') {
      inProgress.push(id)
    } else {
      todo.push(id)
    }
  }

  return {
    tasks,
    columns: {
      'col-1': { id: 'col-1', title: 'To Do', taskIds: todo },
      'col-2': { id: 'col-2', title: 'In Progress', taskIds: inProgress },
      'col-3': { id: 'col-3', title: 'Done', taskIds: done },
    },
    columnOrder: ['col-1', 'col-2', 'col-3'],
  }
}

function ProjectBoard() {
  const loaderData = Route.useLoaderData()
  const { projectId } = Route.useParams()

  // The API may return { project: { ... } } or the object directly
  const raw = (loaderData as { project?: Record<string, unknown> }).project
    ?? (loaderData as Record<string, unknown>)

  const projectName: string = (raw.name as string) ?? 'Project Board'
  const projectDescription: string = (raw.description as string) ?? 'Manage your tasks. Drag and drop to update their status.'

  const [data, setData] = useState<BoardData>(() => buildBoardData(raw))

  const handleDeleteTask = (columnId: string, taskId: string) => {
    const newColumnTaskIds = data.columns[columnId].taskIds.filter(id => id !== taskId)
    const newTasks = { ...data.tasks }
    delete newTasks[taskId]
    setData({
      ...data,
      tasks: newTasks,
      columns: {
        ...data.columns,
        [columnId]: { ...data.columns[columnId], taskIds: newColumnTaskIds },
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

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const startColumn = data.columns[source.droppableId]
    const finishColumn = data.columns[destination.droppableId]

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds)
      newTaskIds.splice(source.index, 1)
      newTaskIds.splice(destination.index, 0, draggableId)
      setData({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } })
      return
    }

    const startTaskIds = Array.from(startColumn.taskIds)
    startTaskIds.splice(source.index, 1)

    const finishTaskIds = Array.from(finishColumn.taskIds)
    finishTaskIds.splice(destination.index, 0, draggableId)

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    })
  }

  // Suppress unused variable warning during development
  void projectId

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
            const tasks = column.taskIds
              .map((taskId) => data.tasks[taskId])
              .filter((task) => task !== undefined)

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasks}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
              />
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
