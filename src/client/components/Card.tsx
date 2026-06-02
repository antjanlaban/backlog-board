import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Priority, Task } from "@shared/types";
import { Pencil, Trash2 } from "lucide-react";

const PRIORITY_LABEL: Record<Priority, string> = { low: "Laag", med: "Middel", high: "Hoog" };
const PRIORITY_CLASS: Record<Priority, string> = {
  low: "bg-neutral-200 text-neutral-700",
  med: "bg-amber-200 text-amber-900",
  high: "bg-red-200 text-red-900",
};

export function Card({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 cursor-grab text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...attributes}
          {...listeners}
        >
          <p className="font-medium">{task.title}</p>
          {task.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bewerk kaart"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Verwijder kaart"
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2">
        <Badge className={PRIORITY_CLASS[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
      </div>
    </div>
  );
}
