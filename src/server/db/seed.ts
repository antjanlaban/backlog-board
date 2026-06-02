import type { Task } from "../../shared/types.js";
import type { Db } from "./connection.js";

const STAMP = "2026-06-02T09:00:00.000Z";

export const SEED_TASKS: Task[] = [
  {
    id: "seed-todo-1",
    title: "Onboarding-flow uittekenen",
    description: "Schetsen van de eerste 3 schermen.",
    status: "todo",
    priority: "high",
    position: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-todo-2",
    title: "Kleurtokens kiezen",
    description: "Light/dark palet vastleggen.",
    status: "todo",
    priority: "med",
    position: 1,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-todo-3",
    title: "Logo-varianten verzamelen",
    description: "",
    status: "todo",
    priority: "low",
    position: 2,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-todo-4",
    title: "Roadmap Q3 opstellen",
    description: "Drie thema's prioriteren.",
    status: "todo",
    priority: "high",
    position: 3,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-doing-1",
    title: "API-contract schrijven",
    description: "Endpoints en foutpaden.",
    status: "doing",
    priority: "high",
    position: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-doing-2",
    title: "Componentbibliotheek opzetten",
    description: "shadcn new-york primitives.",
    status: "doing",
    priority: "med",
    position: 1,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-doing-3",
    title: "Toegankelijkheid testen",
    description: "Toetsenbord-navigatie controleren.",
    status: "doing",
    priority: "low",
    position: 2,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-done-1",
    title: "Repository opzetten",
    description: "Scaffold + CI.",
    status: "done",
    priority: "med",
    position: 0,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-done-2",
    title: "Domeinnaam registreren",
    description: "",
    status: "done",
    priority: "low",
    position: 1,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
  {
    id: "seed-done-3",
    title: "Kick-off met team",
    description: "Scope en planning afgestemd.",
    status: "done",
    priority: "high",
    position: 2,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
];

export function reseed(db: Db): void {
  const insert = db.prepare(
    `INSERT INTO tasks (id, title, description, status, priority, position, createdAt, updatedAt)
     VALUES (@id, @title, @description, @status, @priority, @position, @createdAt, @updatedAt)`,
  );
  const tx = db.transaction(() => {
    db.exec("DELETE FROM tasks");
    for (const t of SEED_TASKS) insert.run(t);
  });
  tx();
}
