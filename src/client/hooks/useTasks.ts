import { api } from "@/lib/api";
import type { CreateTaskBody, Priority, Status, Task, UpdateTaskBody } from "@shared/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { reorder } from "../../server/reorder.js";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .list()
      .then(setTasks)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const create = useCallback(async (body: CreateTaskBody) => {
    try {
      const created = await api.create(body);
      setTasks((prev) => [...prev, created]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const edit = useCallback(
    async (id: string, body: UpdateTaskBody) => {
      const snapshot = tasks;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...body } : t)));
      try {
        const updated = await api.update(id, body);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (e) {
        setTasks(snapshot);
        toast.error((e as Error).message);
      }
    },
    [tasks],
  );

  const move = useCallback(
    async (id: string, toStatus: Status, toIndex: number) => {
      const snapshot = tasks;
      const optimistic = reorder(tasks, id, toStatus, toIndex);
      setTasks(optimistic);
      try {
        const authoritative = await api.move(id, { status: toStatus, position: toIndex });
        setTasks(authoritative);
      } catch (e) {
        setTasks(snapshot);
        toast.error((e as Error).message);
      }
    },
    [tasks],
  );

  const remove = useCallback(
    async (id: string) => {
      const snapshot = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await api.remove(id);
      } catch (e) {
        setTasks(snapshot);
        toast.error((e as Error).message);
      }
    },
    [tasks],
  );

  const resetDemo = useCallback(async () => {
    const snapshot = tasks;
    try {
      const seeded = await api.resetDemo();
      setTasks(seeded);
      toast.success("Demo-data hersteld");
    } catch (e) {
      setTasks(snapshot);
      toast.error((e as Error).message);
    }
  }, [tasks]);

  return { tasks, loading, create, edit, move, remove, resetDemo };
}

export type { Priority, Status, Task };
