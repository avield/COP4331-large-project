import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type Column } from './components/column';
import type { Task } from './components/task';
import { Button } from '@/components/ui/button';
import { Plus, Users, Calendar, MoreHorizontal } from 'lucide-react';

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  component: ProjectBoard,
})

export type BoardData = {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
};

const initialData: BoardData = {
  tasks: {
    "task-1": { id: "task-1", content: "Design the Login screen", priority: "High" },
    "task-2": { id: "task-2", content: "Set up MongoDB schemas", priority: "High" },
    "task-3": { id: "task-3", content: "Implement drag and drop", priority: "Medium" },
    "task-4": { id: "task-4", content: "Write Swagger API docs", priority: "Low" },
  },
  columns: {
    "col-1": { id: "col-1", title: "To Do", taskIds: ["task-1", "task-2", "task-4"] },
    "col-2": { id: "col-2", title: "In Progress", taskIds: ["task-3"] },
    "col-3": { id: "col-3", title: "Done", taskIds: [] },
  },
  columnOrder: ["col-1", "col-2", "col-3"],
};

function ProjectBoard() {
  const [data, setData] = useState(initialData);

  const totalTasks = Object.keys(data.tasks).length;
  const doneTasks = data.columns["col-3"]?.taskIds.length ?? 0;

  const handleDeleteTask = (columnId: string, taskId: string) => {
    const newColumnTaskIds = data.columns[columnId].taskIds.filter(id => id !== taskId);
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    setData({ ...data, tasks: newTasks, columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: newColumnTaskIds } } });
  };

  const handleAddTask = (columnId: string, content: string) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask: Task = { id: newTaskId, content, priority: "Medium" };
    setData({
      ...data,
      tasks: { ...data.tasks, [newTaskId]: newTask },
      columns: { ...data.columns, [columnId]: { ...data.columns[columnId], taskIds: [...data.columns[columnId].taskIds, newTaskId] } },
    });
  };

  const handleAddColumn = () => {
    const newColId = `col-${Date.now()}`;
    setData({
      ...data,
      columns: { ...data.columns, [newColId]: { id: newColId, title: "New Column", taskIds: [] } },
      columnOrder: [...data.columnOrder, newColId],
    });
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      setData({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    });
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
          <p className="text-muted-foreground text-sm mt-1">Drag and drop tasks to update their status.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-3 py-2">
            <span className="flex items-center gap-1.5"><Calendar className="size-3" />{doneTasks}/{totalTasks} done</span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1.5"><Users className="size-3" />Team</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-pointer">
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 flex-1 items-start">
          {data.columnOrder.map((columnId, index) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]).filter(Boolean);
            return <KanbanColumn key={column.id} column={column} tasks={tasks} columnIndex={index}
              onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} />;
          })}
          <button onClick={handleAddColumn}
            className="flex items-center gap-2 shrink-0 w-72 h-12 rounded-lg border border-dashed border-border/40 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/70 text-sm transition-colors cursor-pointer px-4">
            <Plus className="size-4" /> Add column
          </button>
        </div>
      </DragDropContext>
    </div>
  );
}