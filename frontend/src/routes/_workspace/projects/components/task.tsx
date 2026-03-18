import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type Task = {
  id: string;
  content: string;
  priority: "Low" | "Medium" | "High";
};

interface KanbanTaskProps {
  task: Task;
  index: number;
}

export function KanbanTask({ task, index }: KanbanTaskProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3"
          style={{ ...provided.draggableProps.style }}
        >
          <Card 
            className={`cursor-grab active:cursor-grabbing border-muted-foreground/20 hover:border-primary/50 transition-colors ${
              snapshot.isDragging ? "shadow-lg border-primary/50 ring-1 ring-primary/20" : ""
            }`}
          >
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{task.content}</p>
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" />
              </div>
              <div className="flex items-center justify-between">
                <Badge 
                  variant={
                    task.priority === "High" ? "destructive" : 
                    task.priority === "Medium" ? "default" : "secondary"
                  }
                  className="text-[10px] px-1.5 py-0 cursor-pointer"
                >
                  {task.priority}
                </Badge>
                {/* Placeholder for an Avatar later */}
                <Avatar className="size-6 bg-muted border border-background cursor-pointer">
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}