export type Status = "todo" | "doing" | "done";
export type Priority = "low" | "med" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export const STATUSES: Status[] = ["todo", "doing", "done"];
export const PRIORITIES: Priority[] = ["low", "med", "high"];

export interface CreateTaskBody {
  title: string;
  description?: string;
  priority?: Priority;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  priority?: Priority;
}

export interface MoveTaskBody {
  status: Status;
  position: number;
}

export interface ApiError {
  error: string;
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as string[]).includes(value);
}
