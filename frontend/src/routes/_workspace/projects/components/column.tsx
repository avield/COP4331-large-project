import { Droppable } from "@hello-pangea/dnd";
import { KanbanTask, type Task } from "./task";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Column = { id: string; title: string; taskIds: string[] };

const columnAccents = ["border-t-slate-500", "border-t-brand", "border-t-emerald-500", "border-t-purple-500"];

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  columnIndex?: number;
  goalNameById: Record<string, string>;
  onAddTask: (columnId: string) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ 
  column, 
  tasks, 
  columnIndex = 0, 
  goalNameById,
  onAddTask, 
  onDeleteTask,
  onTaskClick 
}: KanbanColumnProps) {

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card border-t-2 ${columnAccents[columnIndex % columnAccents.length]}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-tight">{column.title}</h3>
          <span className="flex items-center justify-center bg-muted text-muted-foreground text-[11px] rounded-full h-[18px] min-w-[18px] px-1 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/50 hover:text-foreground cursor-pointer"
          onClick={() => onAddTask(column.id)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={`flex-1 rounded-lg p-2 min-h-96 transition-colors duration-150 ${
              snapshot.isDraggingOver ? "bg-brand/5 ring-1 ring-brand/20" : "bg-muted/20"
            }`}>
            {tasks.map((task, index) => (
              <KanbanTask 
                key={task.id} 
                task={task} 
                index={index} 
                goalNameById={goalNameById}
                onDelete={() => onDeleteTask(column.id, task.id)}
                onClick={() => onTaskClick(task)} />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && (
              <div className="flex items-center justify-center h-20 rounded-md border border-dashed border-border/30 cursor-pointer hover:border-brand/30 transition-colors"
                onClick={() => onAddTask(column.id)}>
                <span className="text-xs text-muted-foreground/40">+ Add a task</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}