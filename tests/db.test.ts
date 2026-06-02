import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureSchema } from "../src/server/db/migrate.js";
import { SEED_TASKS, reseed } from "../src/server/db/seed.js";
import type { Task } from "../src/shared/types.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  ensureSchema(db);
  reseed(db);
});

describe("db migrate + seed", () => {
  it("seedt het verwachte aantal kaarten", () => {
    const row = db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number };
    expect(row.n).toBe(SEED_TASKS.length);
  });

  it("heeft dichte posities per kolom", () => {
    const rows = db.prepare("SELECT * FROM tasks ORDER BY status, position").all() as Task[];
    for (const status of ["todo", "doing", "done"] as const) {
      const positions = rows.filter((r) => r.status === status).map((r) => r.position);
      expect(positions).toEqual(positions.map((_, i) => i));
    }
  });

  it("is idempotent: tweede reseed houdt aantal gelijk", () => {
    reseed(db);
    const row = db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number };
    expect(row.n).toBe(SEED_TASKS.length);
  });
});
