import type { Db } from "./connection.js";

export function ensureSchema(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      status      TEXT    NOT NULL CHECK (status IN ('todo','doing','done')),
      priority    TEXT    NOT NULL CHECK (priority IN ('low','med','high')),
      position    INTEGER NOT NULL,
      createdAt   TEXT    NOT NULL,
      updatedAt   TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status_position ON tasks (status, position);
  `);
}
