import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type Task = {
  id: string;
  content: string;
  priority: "Low" | "Medium" | "High";
};

interface KanbanTaskProps {
  task: Task;
  index: number;
  onDelete: () => void;
}

export function KanbanTask({ task, index, onDelete }: KanbanTaskProps) {
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
            className={`cursor-grab active:cursor-grabbing border-muted-foreground/20 hover:border-primary/50 transition-colors pt-6 pb-4 ${
              snapshot.isDragging ? "shadow-lg border-primary/50 ring-1 ring-primary/20" : ""
            }`}
          >
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{task.content}</p>

                <div className="flex items-center shrink-0 -mr-1 -mt-1">
                  {/* The 3 Dots Dropdown */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors cursor-pointer outline-none">
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {/* Delete Option */}
                      <DropdownMenuItem 
                        onClick={onDelete}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>     
                </div>
              </div>

              <div className="flex items-start justify-end gap-2">
                <GripVertical className="size-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab -mr-1" />
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