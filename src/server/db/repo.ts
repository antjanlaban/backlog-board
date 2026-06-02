import { randomUUID } from "node:crypto";
import type { CreateTaskBody, Status, Task, UpdateTaskBody } from "../../shared/types.js";
import { reorder } from "../reorder.js";
import type { Db } from "./connection.js";
import { reseed as reseedDb } from "./seed.js";

function now(): string {
  return new Date().toISOString();
}

export class TaskRepo {
  constructor(private readonly db: Db) {}

  listAll(): Task[] {
    return this.db.prepare("SELECT * FROM tasks ORDER BY status, position").all() as Task[];
  }

  getById(id: string): Task | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    return row ?? null;
  }

  reseed(): Task[] {
    reseedDb(this.db);
    return this.listAll();
  }

  insert(body: Required<CreateTaskBody>): Task {
    const maxRow = this.db
      .prepare("SELECT MAX(position) AS maxPos FROM tasks WHERE status = 'todo'")
      .get() as { maxPos: number | null };
    const position = (maxRow.maxPos ?? -1) + 1;
    const stamp = now();
    const task: Task = {
      id: randomUUID(),
      title: body.title,
      description: body.description,
      status: "todo",
      priority: body.priority,
      position,
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, status, priority, position, createdAt, updatedAt)
         VALUES (@id, @title, @description, @status, @priority, @position, @createdAt, @updatedAt)`,
      )
      .run(task);
    return task;
  }

  update(id: string, body: UpdateTaskBody): Task | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const next: Task = {
      ...existing,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      updatedAt: now(),
    };
    this.db
      .prepare(
        "UPDATE tasks SET title=@title, description=@description, priority=@priority, updatedAt=@updatedAt WHERE id=@id",
      )
      .run(next);
    return next;
  }

  move(id: string, toStatus: Status, toIndex: number): Task[] | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const stamp = now();
    const tx = this.db.transaction(() => {
      const all = this.listAll();
      const reordered = reorder(all, id, toStatus, toIndex);
      const update = this.db.prepare(
        "UPDATE tasks SET status=@status, position=@position, updatedAt=@updatedAt WHERE id=@id",
      );
      const before = new Map(all.map((t) => [t.id, t]));
      for (const t of reordered) {
        const prev = before.get(t.id);
        if (!prev) continue;
        if (prev.status !== t.status || prev.position !== t.position) {
          update.run({
            id: t.id,
            status: t.status,
            position: t.position,
            updatedAt: t.id === id ? stamp : prev.updatedAt,
          });
        }
      }
    });
    tx();
    return this.listAll();
  }

  remove(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    const tx = this.db.transaction(() => {
      this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      const remaining = this.db
        .prepare("SELECT * FROM tasks WHERE status = ? ORDER BY position")
        .all(existing.status) as Task[];
      const update = this.db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
      remaining.forEach((t, i) => {
        if (t.position !== i) update.run(i, t.id);
      });
    });
    tx();
    return true;
  }
}
