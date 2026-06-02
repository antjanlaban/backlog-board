import type { CreateTaskBody, MoveTaskBody, Task, UpdateTaskBody } from "@shared/types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Verzoek mislukt (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* lege/niet-JSON body */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  list: () => fetch("/api/tasks").then((r) => handle<Task[]>(r)),
  create: (body: CreateTaskBody) =>
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<Task>(r)),
  update: (id: string, body: UpdateTaskBody) =>
    fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<Task>(r)),
  move: (id: string, body: MoveTaskBody) =>
    fetch(`/api/tasks/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<Task[]>(r)),
  remove: (id: string) =>
    fetch(`/api/tasks/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),
  resetDemo: () => fetch("/api/seed/reset", { method: "POST" }).then((r) => handle<Task[]>(r)),
};
