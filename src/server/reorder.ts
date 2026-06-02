import type { Status, Task } from "../shared/types.js";
import { STATUSES } from "../shared/types.js";

function clamp(index: number, min: number, max: number): number {
  if (index < min) return min;
  if (index > max) return max;
  return index;
}

function renumber(column: Task[]): Task[] {
  return column.map((task, i) => (task.position === i ? { ...task } : { ...task, position: i }));
}

export function reorder(tasks: Task[], taskId: string, toStatus: Status, toIndex: number): Task[] {
  const moved = tasks.find((t) => t.id === taskId);
  if (!moved) {
    throw new Error(`reorder: task ${taskId} bestaat niet`);
  }
  const fromStatus = moved.status;

  // Groepeer per kolom, op huidige positie gesorteerd, als kopieën.
  const columns = new Map<Status, Task[]>();
  for (const status of STATUSES) {
    columns.set(
      status,
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position)
        .map((t) => ({ ...t })),
    );
  }

  // Verwijder de task uit de bronkolom.
  const source = columns.get(fromStatus) as Task[];
  const sourceIndex = source.findIndex((t) => t.id === taskId);
  source.splice(sourceIndex, 1);

  // Voeg in de doelkolom in op geclampte index.
  const target = columns.get(toStatus) as Task[];
  const insertAt = clamp(toIndex, 0, target.length);
  const inserted: Task = { ...moved, status: toStatus };
  target.splice(insertAt, 0, inserted);

  // Hernummer dicht: zowel bron als doel (bij same-column is het dezelfde array).
  columns.set(fromStatus, renumber(columns.get(fromStatus) as Task[]));
  columns.set(toStatus, renumber(columns.get(toStatus) as Task[]));

  // Bouw resultaat, conventioneel gesorteerd op status dan position.
  const result: Task[] = [];
  for (const status of STATUSES) {
    result.push(...(columns.get(status) as Task[]));
  }
  return result;
}
