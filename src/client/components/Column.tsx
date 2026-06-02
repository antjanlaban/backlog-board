import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Status, Task } from "@shared/types";
import { Card } from "./Card";
import { EmptyColumn } from "./EmptyColumn";

const TITLES: Record<Status, string> = { todo: "Todo", doing: "Doing", done: "Done" };

export function Column({
  status,
  tasks,
  onEdit,
  onDelete,
}: {
  status: Status;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `col-${status}` });
  const sorted = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <section
      ref={setNodeRef}
      className="flex w-full flex-col gap-3 rounded-lg bg-muted/40 p-3"
      aria-label={TITLES[status]}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="font-semibold">{TITLES[status]}</h2>
        <span className="rounded-full bg-muted px-2 text-sm text-muted-foreground">
          {sorted.length}
        </span>
      </header>
      <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {sorted.length === 0 ? (
            <EmptyColumn />
          ) : (
            sorted.map((task) => (
              <Card key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
