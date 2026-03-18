import { Droppable } from "@hello-pangea/dnd";
import { KanbanTask, type Task } from "./task";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export type Column = {
    id: string;
    title: string;
    taskIds: string[];
};


interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string, content: string) => void;
}

export function KanbanColumn({ column, tasks, onAddTask }: KanbanColumnProps) {
    const[isAdding, setIsAdding] = useState(false);
    const [newTaskText, setNewTaskText] = useState("");

  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <span className="flex items-center justify-center bg-muted text-muted-foreground text-xs rounded-full h-5 w-5 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-l p-3 min-h-125 transition-colors duration-5 ${
              snapshot.isDraggingOver ? "bg-muted/50" : "bg-muted/30"
            }`}
          >
            {tasks.map((task, index) => (
              <KanbanTask key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}

            {isAdding && (
              <div className="mt-2">
                <Textarea
                  autoFocus
                  placeholder="What needs to be done?"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onBlur={() => {
                    if (newTaskText.trim() !== "") {
                      onAddTask(column.id, newTaskText);
                    }
                    setNewTaskText("");
                    setIsAdding(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur(); 
                    }

                    if (e.key === "Escape") {
                      setNewTaskText("");
                      setIsAdding(false);
                    }
                  }}
                  className="bg-background border-primary/50 min-h-25 resize-none"
                />
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}