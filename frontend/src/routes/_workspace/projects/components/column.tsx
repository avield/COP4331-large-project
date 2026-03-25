import { Droppable } from "@hello-pangea/dnd";
import { KanbanTask, type Task } from "./task";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export type Column = { id: string; title: string; taskIds: string[] };

const columnAccents = ["border-t-slate-500", "border-t-brand", "border-t-emerald-500", "border-t-purple-500"];

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  columnIndex?: number;
  onAddTask: (columnId: string, content: string) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
}

export function KanbanColumn({ column, tasks, columnIndex = 0, onAddTask, onDeleteTask }: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  const handleAdd = () => {
    if (newTaskText.trim()) onAddTask(column.id, newTaskText.trim());
    setNewTaskText(""); setIsAdding(false);
  };

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card border-t-2 ${columnAccents[columnIndex % columnAccents.length]}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-tight">{column.title}</h3>
          <span className="flex items-center justify-center bg-muted text-muted-foreground text-[11px] rounded-full h-[18px] min-w-[18px] px-1 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-foreground cursor-pointer"
          onClick={() => setIsAdding(true)}>
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
              <KanbanTask key={task.id} task={task} index={index} onDelete={() => onDeleteTask(column.id, task.id)} />
            ))}
            {provided.placeholder}

            {isAdding && (
              <div className="mt-1 rounded-lg border border-brand/30 bg-card p-2 space-y-2">
                <Textarea autoFocus placeholder="What needs to be done?" value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
                    if (e.key === "Escape") { setNewTaskText(""); setIsAdding(false); }
                  }}
                  className="bg-background border-border/50 min-h-16 resize-none text-sm" />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 px-3 text-xs bg-brand hover:bg-brand/90 text-brand-foreground cursor-pointer" onClick={handleAdd}>
                    <Check className="size-3 mr-1" /> Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs cursor-pointer text-muted-foreground"
                    onClick={() => { setNewTaskText(""); setIsAdding(false); }}>
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            {tasks.length === 0 && !isAdding && (
              <div className="flex items-center justify-center h-20 rounded-md border border-dashed border-border/30 cursor-pointer hover:border-brand/30 transition-colors"
                onClick={() => setIsAdding(true)}>
                <span className="text-xs text-muted-foreground/40">+ Add a task</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}