import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";

export type Task = {
  id: string;
  content: string;
  priority: "High" | "Medium" | "Low";
};

const priorityConfig = {
  High:   { dot: "bg-red-500",     badge: "text-red-400 bg-red-500/10 border-red-500/20" },
  Medium: { dot: "bg-amber-500",   badge: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  Low:    { dot: "bg-emerald-500", badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

interface KanbanTaskProps {
  task: Task;
  index: number;
  onDelete: () => void;
}

export function KanbanTask({ task, index, onDelete }: KanbanTaskProps) {
  const priority = priorityConfig[task.priority];
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}
          className={`group relative mb-2 rounded-lg border bg-card p-3 transition-all duration-150 ${
            snapshot.isDragging
              ? "shadow-xl shadow-black/30 border-brand/30 ring-1 ring-brand/20 rotate-1 scale-105"
              : "border-border/50 hover:border-border hover:shadow-md hover:shadow-black/10"
          }`}>
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps}
              className="mt-0.5 text-muted-foreground/30 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing transition-colors shrink-0">
              <GripVertical className="size-3.5" />
            </div>
            <p className="flex-1 text-sm leading-snug text-foreground/90 pr-6">{task.content}</p>
          </div>
          <div className="mt-2.5 pl-5">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${priority.badge}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${priority.dot}`} />
              {task.priority}
            </span>
          </div>
          <Button variant="ghost" size="icon"
            className="absolute right-1.5 top-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all"
            onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Draggable>
  );
}