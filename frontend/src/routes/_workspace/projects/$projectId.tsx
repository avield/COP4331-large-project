import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from './components/column';

export const Route = createFileRoute('/_workspace/projects/$projectId')({
  component: ProjectBoard,
})

// MOCK DATA
const initialData = {
  tasks: {
    "task-1": { id: "task-1", content: "Design the Login screen", priority: "High" as const },
    "task-2": { id: "task-2", content: "Set up MongoDB schemas", priority: "High" as const },
    "task-3": { id: "task-3", content: "Implement drag and drop", priority: "Medium" as const },
    "task-4": { id: "task-4", content: "Write Swagger API docs", priority: "Low" as const },
  },
  columns: {
    "col-1": { id: "col-1", title: "To Do", taskIds: ["task-1", "task-2", "task-4"] },
    "col-2": { id: "col-2", title: "In Progress", taskIds: ["task-3"] },
    "col-3": { id: "col-3", title: "Done", taskIds: [] },
  },
  columnOrder:["col-1", "col-2", "col-3"],
};

function ProjectBoard() {
  const [data, setData] = useState(initialData);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the exact same spot
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const startColumn = data.columns[source.droppableId as keyof typeof data.columns];
    const finishColumn = data.columns[destination.droppableId as keyof typeof data.columns];

    // Moving within the same column
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setData({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      return;
    }

    // Moving from one column to another column
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStartColumn = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinishColumn = { ...finishColumn, taskIds: finishTaskIds };

    setData({
      ...data,
      columns: {
        ...data.columns,
        [newStartColumn.id]: newStartColumn,[newFinishColumn.id]: newFinishColumn,
      },
    });
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Project Board</h1>
        <p className="text-muted-foreground mt-2">
          Manage your tasks. Drag and drop to update their status.
        </p>
      </div>

      {/* Board Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId as keyof typeof data.columns];
            const tasks = column.taskIds
                .map((taskId) => data.tasks[taskId as keyof typeof data.tasks])
                .filter((task) => task !== undefined);
            
            return <KanbanColumn key={column.id} column={column} tasks={tasks} />;
          })}
        </div>
      </DragDropContext>
    </div>
  );
}