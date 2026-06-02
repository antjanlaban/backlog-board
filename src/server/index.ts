import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.js";
import { openDb } from "./db/connection.js";
import { ensureSchema } from "./db/migrate.js";
import { TaskRepo } from "./db/repo.js";

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? "data/backlog.db";

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = openDb(DB_PATH);
ensureSchema(db);

const repo = new TaskRepo(db);
const count = db.prepare("SELECT COUNT(*) AS n FROM tasks").get() as { n: number };
if (count.n === 0) {
  repo.reseed();
}

const app = createApp(repo);
app.listen(PORT, () => {
  console.log(`Backlog-board API luistert op http://localhost:${PORT}`);
});
