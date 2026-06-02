import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Status, Task } from "@shared/types";
import { STATUSES } from "@shared/types";
import { Column } from "./Column";

const announcements = {
  onDragStart: () => "Kaart opgepakt. Gebruik de pijltjestoetsen om te verplaatsen.",
  onDragOver: () => "Kaart wordt verplaatst.",
  onDragEnd: () => "Kaart neergezet.",
  onDragCancel: () => "Verplaatsen geannuleerd.",
};

const screenReaderInstructions =
  "Druk op Spatie om een kaart op te pakken, gebruik de pijltjestoetsen om te verplaatsen, en druk nogmaals op Spatie om los te laten.";

export function Board({
  tasks,
  onMove,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onMove: (id: string, toStatus: Status, toIndex: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function byStatus(status: Status): Task[] {
    return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    let toStatus: Status;
    let toIndex: number;

    if (overId.startsWith("col-")) {
      toStatus = overId.slice(4) as Status;
      toIndex = byStatus(toStatus).length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      toStatus = overTask.status;
      toIndex = byStatus(toStatus).findIndex((t) => t.id === overId);
    }

    if (activeId === overId && toStatus === tasks.find((t) => t.id === activeId)?.status) {
      return;
    }
    onMove(activeId, toStatus, toIndex);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: screenReaderInstructions },
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus(status)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
