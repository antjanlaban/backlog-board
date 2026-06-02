# Backlog Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een full-stack backlog-board (SPA met Todo/Doing/Done-kolommen) met kaart-CRUD, toegankelijke drag-and-drop (muis + toetsenbord) en optimistic update/rollback, persistent in SQLite via een eigen Express REST-API.

**Architecture:** Eén `package.json` met `src/server/` (Express + better-sqlite3 + dunne repo-laag + pure `reorder`), `src/client/` (React 19 + Tailwind v4 + shadcn new-york + @dnd-kit) en `src/shared/` (types als single source of truth). `concurrently` draait Vite (5173, HMR) náást `tsx watch` op Express (3001); Vite proxyt `/api`. De positie-strategie is dichte integers, herberekend door een pure `reorder`-functie die los unit-getest wordt; de API wordt met supertest tegen een in-memory SQLite getest incl. 400/404-foutpaden.

**Tech Stack:** TypeScript (strict), Express, better-sqlite3, Vite, React 19, Tailwind v4, shadcn/ui (new-york), @dnd-kit, Vitest, supertest, Biome, Bun (package manager + runner).

---

## File Structure

Te creëren / te wijzigen bestanden en hun verantwoordelijkheid:

- `package.json` — **modify**: dev/build/test/typecheck-scripts + dependencies.
- `tsconfig.json` — **modify**: types `node` i.p.v. `bun`; basis voor server/shared.
- `tsconfig.client.json` — **create**: client-build-config (DOM, jsx react-jsx, vite/client).
- `vite.config.ts` — **create**: root `src/client`, React-plugin, Tailwind-plugin, `/api`-proxy.
- `vitest.config.ts` — **create**: node-environment voor server/shared-tests.
- `src/client/index.html` — **create**: Vite entry.
- `components.json` — **create**: shadcn-config (new-york, alias).
- `.gitignore` — **modify**: `data/` toevoegen.
- `src/shared/types.ts` — **create**: `Task`, `Status`, `Priority`, constants, request/response-shapes.
- `src/server/db/connection.ts` — **create**: `openDb(path)` + PRAGMA's.
- `src/server/db/migrate.ts` — **create**: `ensureSchema(db)`.
- `src/server/db/seed.ts` — **create**: `SEED_TASKS` + `reseed(db)`.
- `src/server/db/repo.ts` — **create**: `TaskRepo` (listAll/insert/update/move/remove/reseed).
- `src/server/reorder.ts` — **create**: PURE `reorder(tasks, taskId, toStatus, toIndex)`.
- `src/server/validation.ts` — **create**: input-guards + `ValidationError`.
- `src/server/routes/tasks.ts` — **create**: router voor `/api/tasks*` + `/api/seed/reset`.
- `src/server/app.ts` — **create**: `createApp(db)` → Express instance (geen listen).
- `src/server/index.ts` — **create** (vervangt placeholder): open db, ensureSchema, seed-bij-leeg, listen.
- `src/client/lib/utils.ts` — **create**: `cn()`.
- `src/client/lib/api.ts` — **create**: fetch-wrapper rond `/api`.
- `src/client/index.css` — **create**: Tailwind v4 entry + shadcn tokens.
- `src/client/main.tsx` — **create**: React root.
- `src/client/App.tsx` — **create**: data-fetch + state + toaster + knoppen.
- `src/client/hooks/useTasks.ts` — **create**: optimistic create/edit/move/delete/resetDemo + rollback.
- `src/client/components/Board.tsx` — **create**: DndContext + 3 kolommen.
- `src/client/components/Column.tsx` — **create**: droppable + SortableContext.
- `src/client/components/Card.tsx` — **create**: useSortable kaart + prioriteit-badge.
- `src/client/components/TaskDialog.tsx` — **create**: create/edit-form.
- `src/client/components/DeleteConfirm.tsx` — **create**: AlertDialog.
- `src/client/components/EmptyColumn.tsx` — **create**: lege-staat.
- `src/client/components/ui/*` — **create**: shadcn primitives (via CLI).
- `tests/reorder.test.ts` — **create**: unit-tests pure reorder.
- `tests/api.test.ts` — **create**: supertest-integratie incl. 400/404.
- `src/index.ts` / `tests/index.test.ts` — **delete**: scaffold-placeholders.

---

### Task 1: Monorepo-scaffold, scripts, dev-orchestratie & Vitest-config 🆕

**Bewijslast (greenfield):** `package.json`, `tsconfig.json`, `tsconfig.client.json`, `vite.config.ts`, `vitest.config.ts`, `src/client/index.html`, `components.json` zijn nieuw of worden van placeholder naar projectstructuur gebracht. Het nieuwe gedrag wordt gedemonstreerd door Step 7: `bun run typecheck` slaagt en `bun run test` draait een eerste rode→groene smoke-test (`tests/smoke.test.ts`). Huidige staat: `src/index.ts:1` bevat alleen een `greet`-placeholder; er is geen server/client/build-config.

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.client.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/client/index.html`
- Create: `components.json`
- Modify: `.gitignore`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Installeer dependencies**

```bash
bun add express better-sqlite3 react react-dom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities class-variance-authority clsx tailwind-merge lucide-react sonner
bun add -d vite @vitejs/plugin-react tsx concurrently tailwindcss @tailwindcss/vite supertest @types/express @types/better-sqlite3 @types/supertest @types/react @types/react-dom @types/node jsdom
```

- [ ] **Step 2: Vervang `package.json`-scripts en zet projectinfo**

Vervang het `"scripts"`-blok in `package.json` volledig door:

```jsonc
{
  "scripts": {
    "dev": "concurrently -k -n server,client -c blue,magenta \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:client": "vite",
    "build": "tsc -p tsconfig.client.json --noEmit && vite build",
    "start": "tsx src/server/index.ts",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.client.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "biome check .",
    "format": "biome format --write .",
    "lint": "biome lint ."
  }
}
```

- [ ] **Step 3: Pas `tsconfig.json` aan (server/shared-basis)**

Wijzig in `tsconfig.json` het `"types"`-veld van `["bun"]` naar `["node"]` (server draait onder tsx/Node, niet als Bun-types). Laat de rest (strict, noUncheckedIndexedAccess, verbatimModuleSyntax, include `src/**/*` + `tests/**/*`, exclude `.worktrees`) ongewijzigd. Voeg aan `"exclude"` toe: `"src/client"` zodat de client door zijn eigen config wordt gedekt:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", ".worktrees", "src/client"]
}
```

- [ ] **Step 4: Maak `tsconfig.client.json`**

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/client/*"]
    }
  },
  "include": ["src/client/**/*", "src/shared/**/*"],
  "exclude": ["node_modules", "dist", ".worktrees"]
}
```

- [ ] **Step 5: Maak `vite.config.ts`, `src/client/index.html`, `components.json`**

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/client"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } },
  },
  build: { outDir: "../../dist", emptyOutDir: true },
});
```

`src/client/index.html`:

```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Backlog Board</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

`components.json` (shadcn new-york):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/client/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks",
    "lib": "@/lib"
  }
}
```

- [ ] **Step 6: Maak `vitest.config.ts` en `.gitignore`-aanpassing**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Voeg in `.gitignore` onder het `# Node / Bun`-blok een regel toe voor de SQLite-data:

```
# SQLite data
data/
```

- [ ] **Step 7: Schrijf een falende smoke-test en draai die rood→groen**

Maak `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("scaffold smoke", () => {
  it("kan een module importeren en assertion draaien", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `bun run test`
Expected: PASS (1 passed). Run ook `bun run typecheck` → Expected: geen errors.

- [ ] **Step 8: Verwijder scaffold-placeholders**

```bash
rm src/index.ts tests/index.test.ts
```

Run daarna `bun run test` opnieuw → Expected: alleen `smoke.test.ts` draait, PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(scaffold): monorepo-config, scripts, dev-orchestratie en vitest-setup"
```

---

### Task 2: Gedeelde types 🆕

**Bewijslast (greenfield):** `src/shared/types.ts` is nieuw. Het nieuwe gedrag (single source of truth voor `Task`/`Status`/`Priority` over server én client) wordt gedemonstreerd doordat `bun run typecheck` slaagt met de geëxporteerde types en constants, en alle latere tasks ertegen importeren zonder type-fouten.

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Schrijf `src/shared/types.ts`**

```ts
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
```

- [ ] **Step 2: Verifieer typecheck**

Run: `bun run typecheck`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(shared): Task/Status/Priority types en type-guards"
```

---

### Task 3: DB-laag — connectie, migratie en seed 🆕

**Bewijslast (greenfield):** `src/server/db/connection.ts`, `migrate.ts` en `seed.ts` zijn nieuw. Het nieuwe gedrag (idempotente schema-creatie + deterministische seed van ~10 kaarten) wordt gedemonstreerd door Step 5: een tijdelijke Vitest die tegen `:memory:` `ensureSchema` + `reseed` draait en `listAll`-rijaantal/sortering controleert. Blast-radius: alleen de server-DB-laag; geen bestaande code raakt dit.

**Files:**
- Create: `src/server/db/connection.ts`
- Create: `src/server/db/migrate.ts`
- Create: `src/server/db/seed.ts`
- Test: `tests/db.test.ts`

- [ ] **Step 1: Schrijf `src/server/db/connection.ts`**

```ts
import Database from "better-sqlite3";

export type Db = Database.Database;

export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
```

- [ ] **Step 2: Schrijf `src/server/db/migrate.ts`**

```ts
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
```

- [ ] **Step 3: Schrijf `src/server/db/seed.ts`**

`SEED_TASKS` zijn ~10 deterministische kaarten (Todo 4, Doing 3, Done 3), dichte `position` per kolom, vaste ISO-stamps. `reseed` wipet en herinsert in één transactie. Let op: de inserts in deze module worden hergebruikt door de repo; we exporteren daarom alleen de data + een `reseed` die een `db` krijgt.

```ts
import type { Db } from "./connection.js";
import type { Task } from "../../shared/types.js";

const STAMP = "2026-06-02T09:00:00.000Z";

export const SEED_TASKS: Task[] = [
  { id: "seed-todo-1", title: "Onboarding-flow uittekenen", description: "Schetsen van de eerste 3 schermen.", status: "todo", priority: "high", position: 0, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-todo-2", title: "Kleurtokens kiezen", description: "Light/dark palet vastleggen.", status: "todo", priority: "med", position: 1, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-todo-3", title: "Logo-varianten verzamelen", description: "", status: "todo", priority: "low", position: 2, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-todo-4", title: "Roadmap Q3 opstellen", description: "Drie thema's prioriteren.", status: "todo", priority: "high", position: 3, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-doing-1", title: "API-contract schrijven", description: "Endpoints en foutpaden.", status: "doing", priority: "high", position: 0, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-doing-2", title: "Componentbibliotheek opzetten", description: "shadcn new-york primitives.", status: "doing", priority: "med", position: 1, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-doing-3", title: "Toegankelijkheid testen", description: "Toetsenbord-navigatie controleren.", status: "doing", priority: "low", position: 2, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-done-1", title: "Repository opzetten", description: "Scaffold + CI.", status: "done", priority: "med", position: 0, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-done-2", title: "Domeinnaam registreren", description: "", status: "done", priority: "low", position: 1, createdAt: STAMP, updatedAt: STAMP },
  { id: "seed-done-3", title: "Kick-off met team", description: "Scope en planning afgestemd.", status: "done", priority: "high", position: 2, createdAt: STAMP, updatedAt: STAMP },
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
```

- [ ] **Step 4: Schrijf de falende DB-test**

Maak `tests/db.test.ts`:

```ts
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import type { Task } from "../src/shared/types.js";
import { ensureSchema } from "../src/server/db/migrate.js";
import { reseed, SEED_TASKS } from "../src/server/db/seed.js";

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
    const rows = db
      .prepare("SELECT * FROM tasks ORDER BY status, position")
      .all() as Task[];
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
```

- [ ] **Step 5: Run de test rood→groen**

Run: `bun run test tests/db.test.ts`
Expected eerst (vóór seed.ts/migrate.ts bestaan): FAIL met import-/module-fout. Na Steps 1-3: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
git add src/server/db/connection.ts src/server/db/migrate.ts src/server/db/seed.ts tests/db.test.ts
git commit -m "feat(db): connectie, idempotente migratie en deterministische seed"
```

---

### Task 4: Pure `reorder`-functie met unit-tests 🆕

**Bewijslast (greenfield):** `src/server/reorder.ts` is nieuw en heeft geen Express-/SQLite-import. Het nieuwe gedrag (dichte herordening met clamping, puurheid, dicht-&-uniek-invariant) wordt gedemonstreerd door de TDD-tests in `tests/reorder.test.ts` die alle §4-edge-cases dekken en rood→groen gaan. Blast-radius: de reorder-logica wordt later door zowel de move-route als (optioneel) de client gebruikt.

**Files:**
- Create: `src/server/reorder.ts`
- Test: `tests/reorder.test.ts`

- [ ] **Step 1: Schrijf de falende unit-tests**

Maak `tests/reorder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Status, Task } from "../src/shared/types.js";
import { reorder } from "../src/server/reorder.js";

function make(id: string, status: Status, position: number): Task {
  return {
    id,
    title: id,
    description: "",
    status,
    priority: "med",
    position,
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  };
}

function byCol(tasks: Task[], status: Status): Task[] {
  return tasks
    .filter((t) => t.status === status)
    .sort((a, b) => a.position - b.position);
}

function assertDense(tasks: Task[]): void {
  for (const status of ["todo", "doing", "done"] as const) {
    const positions = byCol(tasks, status).map((t) => t.position);
    expect(positions).toEqual(positions.map((_, i) => i));
  }
}

const base: Task[] = [
  make("t0", "todo", 0),
  make("t1", "todo", 1),
  make("t2", "todo", 2),
  make("t3", "todo", 3),
  make("d0", "doing", 0),
];

describe("reorder", () => {
  it("herordent omhoog binnen dezelfde kolom (3 -> 1)", () => {
    const out = reorder(base, "t3", "todo", 1);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t3", "t1", "t2"]);
    assertDense(out);
  });

  it("herordent omlaag binnen dezelfde kolom (1 -> 3)", () => {
    const out = reorder(base, "t1", "todo", 3);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t2", "t3", "t1"]);
    assertDense(out);
  });

  it("verplaatst naar een lege kolom op index 0", () => {
    const out = reorder(base, "t0", "done", 0);
    expect(byCol(out, "done").map((t) => t.id)).toEqual(["t0"]);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    assertDense(out);
  });

  it("verplaatst naar de eerste positie van een niet-lege kolom", () => {
    const out = reorder(base, "t0", "doing", 0);
    expect(byCol(out, "doing").map((t) => t.id)).toEqual(["t0", "d0"]);
    assertDense(out);
  });

  it("clampt een te grote toIndex naar achteraan", () => {
    const out = reorder(base, "t0", "doing", 99);
    expect(byCol(out, "doing").map((t) => t.id)).toEqual(["d0", "t0"]);
    assertDense(out);
  });

  it("clampt een negatieve toIndex naar 0 zonder exception", () => {
    const out = reorder(base, "t3", "todo", -5);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t3", "t0", "t1", "t2"]);
    assertDense(out);
  });

  it("is een no-op bij zelfde status en zelfde effectieve index", () => {
    const out = reorder(base, "t1", "todo", 1);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t1", "t2", "t3"]);
    assertDense(out);
  });

  it("muteert de input niet (puur)", () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    reorder(base, "t3", "todo", 0);
    expect(base).toEqual(snapshot);
  });

  it("zet de status van de verplaatste task op toStatus", () => {
    const out = reorder(base, "t0", "done", 0);
    expect(out.find((t) => t.id === "t0")?.status).toBe("done");
  });

  it("gooit bij onbekende taskId", () => {
    expect(() => reorder(base, "nope", "todo", 0)).toThrow();
  });
});
```

- [ ] **Step 2: Run de tests om falen te bevestigen**

Run: `bun run test tests/reorder.test.ts`
Expected: FAIL — `reorder is not a function` / module niet gevonden.

- [ ] **Step 3: Implementeer `src/server/reorder.ts`**

```ts
import type { Status, Task } from "../shared/types.js";
import { STATUSES } from "../shared/types.js";

function clamp(index: number, min: number, max: number): number {
  if (index < min) return min;
  if (index > max) return max;
  return index;
}

function renumber(column: Task[]): Task[] {
  return column.map((task, i) =>
    task.position === i ? { ...task } : { ...task, position: i },
  );
}

export function reorder(
  tasks: Task[],
  taskId: string,
  toStatus: Status,
  toIndex: number,
): Task[] {
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
  const source = columns.get(fromStatus)!;
  const sourceIndex = source.findIndex((t) => t.id === taskId);
  source.splice(sourceIndex, 1);

  // Voeg in de doelkolom in op geclampte index.
  const target = columns.get(toStatus)!;
  const insertAt = clamp(toIndex, 0, target.length);
  const inserted: Task = { ...moved, status: toStatus };
  target.splice(insertAt, 0, inserted);

  // Hernummer dicht: zowel bron als doel (bij same-column is het dezelfde array).
  columns.set(fromStatus, renumber(columns.get(fromStatus)!));
  columns.set(toStatus, renumber(columns.get(toStatus)!));

  // Bouw resultaat, conventioneel gesorteerd op status dan position.
  const result: Task[] = [];
  for (const status of STATUSES) {
    result.push(...columns.get(status)!);
  }
  return result;
}
```

- [ ] **Step 4: Run de tests om slagen te bevestigen**

Run: `bun run test tests/reorder.test.ts`
Expected: PASS (10 passed).

- [ ] **Step 5: Commit**

```bash
git add src/server/reorder.ts tests/reorder.test.ts
git commit -m "feat(reorder): pure dichte herordening met clamping + unit-tests"
```

---

### Task 5: Validatie-laag 🆕

**Bewijslast (greenfield):** `src/server/validation.ts` is nieuw. Het nieuwe gedrag (input-guards die `ValidationError` gooien voor de 400-paden uit §3.7) wordt gedemonstreerd in Task 7 door de supertest-foutpad-tests; hier dekken we het met directe unit-asserts in Step 4. Blast-radius: alleen geïmporteerd door de routes.

**Files:**
- Create: `src/server/validation.ts`
- Test: `tests/validation.test.ts`

- [ ] **Step 1: Schrijf de falende validatie-tests**

Maak `tests/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ValidationError,
  parseCreateBody,
  parseMoveBody,
  parseUpdateBody,
} from "../src/server/validation.js";

describe("parseCreateBody", () => {
  it("accepteert geldige titel en default priority med", () => {
    expect(parseCreateBody({ title: "  Hoi  " })).toEqual({
      title: "Hoi",
      description: "",
      priority: "med",
    });
  });
  it("weigert lege titel", () => {
    expect(() => parseCreateBody({ title: "   " })).toThrow(ValidationError);
  });
  it("weigert ongeldige priority", () => {
    expect(() => parseCreateBody({ title: "x", priority: "urgent" })).toThrow(ValidationError);
  });
});

describe("parseUpdateBody", () => {
  it("staat lege body toe", () => {
    expect(parseUpdateBody({})).toEqual({});
  });
  it("weigert lege titel indien aanwezig", () => {
    expect(() => parseUpdateBody({ title: "  " })).toThrow(ValidationError);
  });
  it("trimt titel en behoudt description", () => {
    expect(parseUpdateBody({ title: " a ", description: "b" })).toEqual({
      title: "a",
      description: "b",
    });
  });
});

describe("parseMoveBody", () => {
  it("accepteert geldige status + position", () => {
    expect(parseMoveBody({ status: "doing", position: 2 })).toEqual({
      status: "doing",
      position: 2,
    });
  });
  it("weigert ontbrekende velden", () => {
    expect(() => parseMoveBody({ status: "doing" })).toThrow(ValidationError);
  });
  it("weigert ongeldige status", () => {
    expect(() => parseMoveBody({ status: "x", position: 0 })).toThrow(ValidationError);
  });
  it("weigert negatieve of niet-integer position", () => {
    expect(() => parseMoveBody({ status: "doing", position: -1 })).toThrow(ValidationError);
    expect(() => parseMoveBody({ status: "doing", position: 1.5 })).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run om falen te bevestigen**

Run: `bun run test tests/validation.test.ts`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Implementeer `src/server/validation.ts`**

```ts
import type { CreateTaskBody, MoveTaskBody, UpdateTaskBody } from "../shared/types.js";
import { isPriority, isStatus } from "../shared/types.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Body moet een object zijn");
  }
  return body as Record<string, unknown>;
}

export function parseCreateBody(body: unknown): Required<CreateTaskBody> {
  const b = asRecord(body);
  if (typeof b.title !== "string" || b.title.trim() === "") {
    throw new ValidationError("Titel is verplicht");
  }
  if (b.priority !== undefined && !isPriority(b.priority)) {
    throw new ValidationError("Ongeldige prioriteit");
  }
  const description = typeof b.description === "string" ? b.description : "";
  return {
    title: b.title.trim(),
    description,
    priority: isPriority(b.priority) ? b.priority : "med",
  };
}

export function parseUpdateBody(body: unknown): UpdateTaskBody {
  const b = asRecord(body);
  const out: UpdateTaskBody = {};
  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim() === "") {
      throw new ValidationError("Titel mag niet leeg zijn");
    }
    out.title = b.title.trim();
  }
  if (b.description !== undefined) {
    if (typeof b.description !== "string") {
      throw new ValidationError("Beschrijving moet tekst zijn");
    }
    out.description = b.description;
  }
  if (b.priority !== undefined) {
    if (!isPriority(b.priority)) {
      throw new ValidationError("Ongeldige prioriteit");
    }
    out.priority = b.priority;
  }
  return out;
}

export function parseMoveBody(body: unknown): MoveTaskBody {
  const b = asRecord(body);
  if (!isStatus(b.status)) {
    throw new ValidationError("Ongeldige of ontbrekende status");
  }
  if (typeof b.position !== "number" || !Number.isInteger(b.position) || b.position < 0) {
    throw new ValidationError("Position moet een integer >= 0 zijn");
  }
  return { status: b.status, position: b.position };
}
```

- [ ] **Step 4: Run om slagen te bevestigen**

Run: `bun run test tests/validation.test.ts`
Expected: PASS (10 passed).

- [ ] **Step 5: Commit**

```bash
git add src/server/validation.ts tests/validation.test.ts
git commit -m "feat(validation): input-guards en ValidationError voor 400-paden"
```

---

### Task 6: Repository-laag 🆕

**Bewijslast (greenfield):** `src/server/db/repo.ts` is nieuw. Het nieuwe gedrag (CRUD + move-persistentie via prepared statements, dichte herberekening bij delete) wordt gedemonstreerd door `tests/repo.test.ts` rood→groen. Blast-radius: alleen de route-laag gebruikt de repo; SQL blijft buiten handlers.

**Files:**
- Create: `src/server/db/repo.ts`
- Test: `tests/repo.test.ts`

- [ ] **Step 1: Schrijf de falende repo-test**

Maak `tests/repo.test.ts`:

```ts
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureSchema } from "../src/server/db/migrate.js";
import { TaskRepo } from "../src/server/db/repo.js";

let repo: TaskRepo;

beforeEach(() => {
  const db = new Database(":memory:");
  ensureSchema(db);
  repo = new TaskRepo(db);
  repo.reseed();
});

describe("TaskRepo", () => {
  it("listAll geeft seed-aantal gesorteerd op status, position", () => {
    const all = repo.listAll();
    expect(all.length).toBe(10);
    const todo = all.filter((t) => t.status === "todo");
    expect(todo.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });

  it("insert plaatst nieuwe kaart achteraan in todo", () => {
    const created = repo.insert({ title: "Nieuw", description: "", priority: "high" });
    expect(created.status).toBe("todo");
    expect(created.position).toBe(4);
    expect(created.priority).toBe("high");
  });

  it("update wijzigt velden en ververst updatedAt, niet status/position", () => {
    const created = repo.insert({ title: "X", description: "", priority: "med" });
    const updated = repo.update(created.id, { title: "Y", priority: "low" });
    expect(updated?.title).toBe("Y");
    expect(updated?.priority).toBe("low");
    expect(updated?.status).toBe("todo");
    expect(updated?.position).toBe(created.position);
  });

  it("update onbekend id geeft null", () => {
    expect(repo.update("nope", { title: "Z" })).toBeNull();
  });

  it("move persisteert reorder en geeft de hele staat terug", () => {
    const all = repo.listAll();
    const first = all.find((t) => t.status === "todo" && t.position === 0)!;
    const result = repo.move(first.id, "doing", 0);
    const doing = result.filter((t) => t.status === "doing");
    expect(doing[0]?.id).toBe(first.id);
    expect(doing.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });

  it("move onbekend id geeft null", () => {
    expect(repo.move("nope", "doing", 0)).toBeNull();
  });

  it("remove verwijdert en hercompacteert bronkolom", () => {
    const all = repo.listAll();
    const todo = all.filter((t) => t.status === "todo");
    const removed = repo.remove(todo[1]!.id);
    expect(removed).toBe(true);
    const after = repo.listAll().filter((t) => t.status === "todo");
    expect(after.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it("remove onbekend id geeft false", () => {
    expect(repo.remove("nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run om falen te bevestigen**

Run: `bun run test tests/repo.test.ts`
Expected: FAIL — `TaskRepo` niet gevonden.

- [ ] **Step 3: Implementeer `src/server/db/repo.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { Db } from "./connection.js";
import { reseed as reseedDb } from "./seed.js";
import { reorder } from "../reorder.js";
import type {
  CreateTaskBody,
  Status,
  Task,
  UpdateTaskBody,
} from "../../shared/types.js";

function now(): string {
  return new Date().toISOString();
}

export class TaskRepo {
  constructor(private readonly db: Db) {}

  listAll(): Task[] {
    return this.db
      .prepare("SELECT * FROM tasks ORDER BY status, position")
      .all() as Task[];
  }

  getById(id: string): Task | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | Task
      | undefined;
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
        `UPDATE tasks SET title=@title, description=@description, priority=@priority, updatedAt=@updatedAt WHERE id=@id`,
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
        const prev = before.get(t.id)!;
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
```

- [ ] **Step 4: Run om slagen te bevestigen**

Run: `bun run test tests/repo.test.ts`
Expected: PASS (8 passed).

- [ ] **Step 5: Commit**

```bash
git add src/server/db/repo.ts tests/repo.test.ts
git commit -m "feat(repo): TaskRepo CRUD/move/remove met prepared statements"
```

---

### Task 7: REST-API (routes + app) met supertest-integratietests 🆕

**Bewijslast (greenfield):** `src/server/routes/tasks.ts` en `src/server/app.ts` zijn nieuw. Het nieuwe gedrag (de zes endpoints uit §3 incl. 400/404-foutpaden en malformed-JSON-handling) wordt gedemonstreerd door `tests/api.test.ts` (supertest tegen in-memory SQLite) rood→groen. Blast-radius: dit is de publieke API-rand; de client praat er straks tegen.

**Files:**
- Create: `src/server/routes/tasks.ts`
- Create: `src/server/app.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Schrijf de falende integratietests**

Maak `tests/api.test.ts`:

```ts
import Database from "better-sqlite3";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createApp } from "../src/server/app.js";
import { ensureSchema } from "../src/server/db/migrate.js";
import { TaskRepo } from "../src/server/db/repo.js";
import type { Task } from "../src/shared/types.js";

let app: Express;
let repo: TaskRepo;

beforeEach(() => {
  const db = new Database(":memory:");
  ensureSchema(db);
  repo = new TaskRepo(db);
  repo.reseed();
  app = createApp(repo);
});

describe("GET /api/tasks", () => {
  it("200 + seed-aantal, gesorteerd", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
    const todo = (res.body as Task[]).filter((t) => t.status === "todo");
    expect(todo.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });
});

describe("POST /api/tasks", () => {
  it("201 + nieuwe kaart achteraan in todo", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "Nieuw", priority: "high" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("todo");
    expect(res.body.position).toBe(4);
    expect(res.body.priority).toBe("high");
  });
  it("400 bij lege titel", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
  it("400 bij ongeldige priority", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "x", priority: "urgent" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("200 + bijgewerkte velden", async () => {
    const created = (await request(app).post("/api/tasks").send({ title: "x" })).body as Task;
    const res = await request(app).patch(`/api/tasks/${created.id}`).send({ title: "y" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("y");
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app).patch("/api/tasks/nope").send({ title: "y" });
    expect(res.status).toBe(404);
  });
  it("400 bij lege titel", async () => {
    const created = (await request(app).post("/api/tasks").send({ title: "x" })).body as Task;
    const res = await request(app).patch(`/api/tasks/${created.id}`).send({ title: "  " });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/tasks/:id/move", () => {
  it("200 + correcte nieuwe ordening", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const first = all.find((t) => t.status === "todo" && t.position === 0)!;
    const res = await request(app).post(`/api/tasks/${first.id}/move`).send({ status: "doing", position: 0 });
    expect(res.status).toBe(200);
    const doing = (res.body as Task[]).filter((t) => t.status === "doing");
    expect(doing[0].id).toBe(first.id);
    expect(doing.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app).post("/api/tasks/nope/move").send({ status: "doing", position: 0 });
    expect(res.status).toBe(404);
  });
  it("400 bij ongeldige status", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const res = await request(app).post(`/api/tasks/${all[0].id}/move`).send({ status: "x", position: 0 });
    expect(res.status).toBe(400);
  });
  it("400 bij negatieve position", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const res = await request(app).post(`/api/tasks/${all[0].id}/move`).send({ status: "doing", position: -1 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("204 + resterende posities dicht", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const todo = all.filter((t) => t.status === "todo");
    const res = await request(app).delete(`/api/tasks/${todo[1].id}`);
    expect(res.status).toBe(204);
    const after = ((await request(app).get("/api/tasks")).body as Task[]).filter((t) => t.status === "todo");
    expect(after.map((t) => t.position)).toEqual([0, 1, 2]);
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app).delete("/api/tasks/nope");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/seed/reset", () => {
  it("200 + staat terug op seed", async () => {
    await request(app).delete(`/api/tasks/${((await request(app).get("/api/tasks")).body as Task[])[0].id}`);
    const res = await request(app).post("/api/seed/reset");
    expect(res.status).toBe(200);
    expect((res.body as Task[]).length).toBe(10);
  });
});

describe("malformed JSON", () => {
  it("400 bij kapotte body", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send('{"title": ');
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run om falen te bevestigen**

Run: `bun run test tests/api.test.ts`
Expected: FAIL — `createApp` niet gevonden.

- [ ] **Step 3: Implementeer `src/server/routes/tasks.ts`**

```ts
import { Router } from "express";
import type { TaskRepo } from "../db/repo.js";
import {
  ValidationError,
  parseCreateBody,
  parseMoveBody,
  parseUpdateBody,
} from "../validation.js";

export function createTasksRouter(repo: TaskRepo): Router {
  const router = Router();

  router.get("/tasks", (_req, res) => {
    res.status(200).json(repo.listAll());
  });

  router.post("/tasks", (req, res) => {
    const body = parseCreateBody(req.body);
    res.status(201).json(repo.insert(body));
  });

  router.patch("/tasks/:id", (req, res) => {
    const body = parseUpdateBody(req.body);
    const updated = repo.update(req.params.id, body);
    if (!updated) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(200).json(updated);
  });

  router.post("/tasks/:id/move", (req, res) => {
    const body = parseMoveBody(req.body);
    const result = repo.move(req.params.id, body.status, body.position);
    if (!result) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(200).json(result);
  });

  router.delete("/tasks/:id", (req, res) => {
    const removed = repo.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(204).end();
  });

  router.post("/seed/reset", (_req, res) => {
    res.status(200).json(repo.reseed());
  });

  return router;
}

export { ValidationError };
```

- [ ] **Step 4: Implementeer `src/server/app.ts`**

Let op de Express-error-handler: validatie-errors → 400, malformed JSON (een `SyntaxError` met `body`-flag van `express.json()`) → 400.

```ts
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { TaskRepo } from "./db/repo.js";
import { createTasksRouter } from "./routes/tasks.js";
import { ValidationError } from "./validation.js";

export function createApp(repo: TaskRepo): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", createTasksRouter(repo));

  // Centrale error-handler. Validatie → 400; malformed JSON → 400; rest → 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Ongeldige JSON" });
      return;
    }
    res.status(500).json({ error: "Interne serverfout" });
  });

  return app;
}
```

Belangrijk: omdat de route-handlers synchroon zijn en `parseCreateBody`/`parseMoveBody`/`parseUpdateBody` synchroon gooien, vangt Express (v4) deze gegooide errors automatisch op en routeert ze naar de error-handler. Geen async-wrapper nodig.

- [ ] **Step 5: Run om slagen te bevestigen**

Run: `bun run test tests/api.test.ts`
Expected: PASS (alle describe-blokken groen).

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/tasks.ts src/server/app.ts tests/api.test.ts
git commit -m "feat(api): tasks CRUD/move/seed endpoints + supertest-integratietests"
```

---

### Task 8: Server-entrypoint (start + seed-bij-leeg) 🆕

**Bewijslast (greenfield):** `src/server/index.ts` vervangt de placeholder. Het nieuwe gedrag (open file-DB, `ensureSchema`, seed-bij-leeg, luisteren op poort 3001) wordt gedemonstreerd in Step 3 door de server te starten en `GET /api/tasks` met curl te bevragen (200 + seed). Blast-radius: dit is het runtime-startpunt; geen test-import (tests gebruiken `createApp` direct).

**Files:**
- Create: `src/server/index.ts` (overschrijft placeholder als die nog bestaat)

- [ ] **Step 1: Schrijf `src/server/index.ts`**

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { openDb } from "./db/connection.js";
import { ensureSchema } from "./db/migrate.js";
import { TaskRepo } from "./db/repo.js";
import { createApp } from "./app.js";

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
```

- [ ] **Step 2: Verifieer typecheck**

Run: `bun run typecheck`
Expected: geen errors.

- [ ] **Step 3: Smoke-test de draaiende server**

Start in de achtergrond: `bun run start` (of `bun run dev:server`). Bevraag daarna:

```bash
curl -s http://localhost:3001/api/tasks
```

Expected: een JSON-array met 10 kaarten. Stop de server daarna weer.

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat(server): entrypoint met seed-bij-leeg en poort 3001"
```

---

### Task 9: Frontend-fundament — Tailwind v4, shadcn-primitives, utils, api, React-root 🆕

**Bewijslast (greenfield):** `src/client/index.css`, `lib/utils.ts`, `lib/api.ts`, `main.tsx` en de shadcn `ui/`-primitives zijn nieuw. Het nieuwe gedrag (Vite-app boot met Tailwind v4 + shadcn-tokens) wordt gedemonstreerd in Step 5 door `bun run dev:client` te starten en een tijdelijke "Backlog Board"-koptekst in de browser te zien renderen. Blast-radius: enkel de clientlaag.

**Files:**
- Create: `src/client/index.css`
- Create: `src/client/lib/utils.ts`
- Create: `src/client/lib/api.ts`
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx` (tijdelijke placeholder, vervangen in Task 11)
- Create: `src/client/components/ui/*` (via shadcn-CLI)

- [ ] **Step 1: Schrijf `src/client/index.css` (Tailwind v4 + shadcn tokens)**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 0 0% 9%;
    --radius: 0.5rem;
  }
  body {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

- [ ] **Step 2: Schrijf `src/client/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Genereer shadcn new-york primitives**

Run (gebruikt de eerder gemaakte `components.json`):

```bash
bunx shadcn@latest add button dialog input textarea label select badge alert-dialog sonner card
```

Expected: bestanden verschijnen in `src/client/components/ui/`. Als de CLI naar config vraagt: style `new-york`, base color `neutral`, css `src/client/index.css`. Verifieer dat `src/client/components/ui/button.tsx` bestaat.

- [ ] **Step 4: Schrijf `src/client/lib/api.ts`**

```ts
import type {
  CreateTaskBody,
  MoveTaskBody,
  Task,
  UpdateTaskBody,
} from "@shared/types";

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
  resetDemo: () =>
    fetch("/api/seed/reset", { method: "POST" }).then((r) => handle<Task[]>(r)),
};
```

- [ ] **Step 4b: Voeg `@shared`-alias toe aan `tsconfig.client.json` paths**

Werk het `paths`-blok in `tsconfig.client.json` bij zodat `@shared/*` resolved:

```jsonc
"paths": {
  "@/*": ["./src/client/*"],
  "@shared/*": ["./src/shared/*"]
}
```

- [ ] **Step 5: Schrijf `src/client/main.tsx` en tijdelijke `App.tsx`**

`src/client/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/client/App.tsx` (tijdelijk, wordt in Task 11 vervangen):

```tsx
export default function App() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Backlog Board</h1>
    </main>
  );
}
```

- [ ] **Step 6: Verifieer boot + typecheck**

Run: `bun run typecheck` → Expected: geen errors.
Start `bun run dev:client`, open `http://localhost:5173` → Expected: "Backlog Board"-koptekst zichtbaar, geen console-errors. Stop daarna.

- [ ] **Step 7: Commit**

```bash
git add src/client components.json tsconfig.client.json
git commit -m "feat(client): Tailwind v4, shadcn-primitives, api-wrapper en React-root"
```

---

### Task 10: `useTasks`-hook met optimistic update + rollback 🆕

**Bewijslast (greenfield):** `src/client/hooks/useTasks.ts` is nieuw. Het nieuwe gedrag (lokale optimistic state + snapshot-rollback + toast bij fout, met dezelfde dichte reorder-semantiek als de server) wordt gedemonstreerd door de end-to-end Playwright-stappen in Task 13 (move blijft staan; geforceerde API-fout rolt terug). Blast-radius: de hook is de enige mutatie-ingang voor `Board`/`Card`/`TaskDialog`.

**Files:**
- Create: `src/client/hooks/useTasks.ts`

- [ ] **Step 1: Schrijf `src/client/hooks/useTasks.ts`**

De client hergebruikt de pure `reorder` uit `src/server/reorder.ts` (geen Express/SQLite-import erin, dus veilig in de browser).

```tsx
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { reorder } from "../../server/reorder.js";
import type {
  CreateTaskBody,
  Priority,
  Status,
  Task,
  UpdateTaskBody,
} from "@shared/types";

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

  const edit = useCallback(async (id: string, body: UpdateTaskBody) => {
    const snapshot = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...body } : t)),
    );
    try {
      const updated = await api.update(id, body);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setTasks(snapshot);
      toast.error((e as Error).message);
    }
  }, [tasks]);

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
```

- [ ] **Step 2: Verifieer typecheck**

Run: `bun run typecheck`
Expected: geen errors.

- [ ] **Step 3: Commit**

```bash
git add src/client/hooks/useTasks.ts
git commit -m "feat(client): useTasks-hook met optimistic update en rollback"
```

---

### Task 11: Board-, Column-, Card-, EmptyColumn-componenten met @dnd-kit 🆕

**Bewijslast (greenfield):** `Board.tsx`, `Column.tsx`, `Card.tsx`, `EmptyColumn.tsx` en de definitieve `App.tsx` zijn nieuw. Het nieuwe gedrag (drie kolommen op statusvolgorde, sleepbare kaarten met PointerSensor + KeyboardSensor, prioriteit-badges, lege-staat) wordt gedemonstreerd door de Playwright-stappen 1, 3 en 5 in Task 13 (board laadt met counts; toetsenbord-move; screenshot). Blast-radius: dit is de hele zichtbare UI; alle mutaties lopen via `useTasks`.

**Files:**
- Create: `src/client/components/EmptyColumn.tsx`
- Create: `src/client/components/Card.tsx`
- Create: `src/client/components/Column.tsx`
- Create: `src/client/components/Board.tsx`
- Modify: `src/client/App.tsx` (vervangt de tijdelijke placeholder)

- [ ] **Step 1: Schrijf `src/client/components/EmptyColumn.tsx`**

```tsx
export function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-center text-muted-foreground">
      <span className="text-3xl" aria-hidden>
        🗒️
      </span>
      <p className="text-sm">Nog niets hier — sleep een kaart of voeg er een toe.</p>
    </div>
  );
}
```

- [ ] **Step 2: Schrijf `src/client/components/Card.tsx`**

Prioriteit-badge-kleuren: low → secondary/grijs, med → amber, high → rood. We gebruiken de shadcn `Badge` met een `className`-override.

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@shared/types";

const PRIORITY_LABEL: Record<Priority, string> = { low: "Laag", med: "Middel", high: "Hoog" };
const PRIORITY_CLASS: Record<Priority, string> = {
  low: "bg-neutral-200 text-neutral-700",
  med: "bg-amber-200 text-amber-900",
  high: "bg-red-200 text-red-900",
};

export function Card({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 cursor-grab text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...attributes}
          {...listeners}
        >
          <p className="font-medium">{task.title}</p>
          {task.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Bewerk kaart" onClick={() => onEdit(task)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Verwijder kaart" onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2">
        <Badge className={PRIORITY_CLASS[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Schrijf `src/client/components/Column.tsx`**

```tsx
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "./Card";
import { EmptyColumn } from "./EmptyColumn";
import type { Status, Task } from "@shared/types";

const TITLES: Record<Status, string> = { todo: "Todo", doing: "Doing", done: "Done" };

export function Column({
  status,
  tasks,
  onEdit,
  onDelete,
}: {
  status: Status;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `col-${status}` });
  const sorted = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <section ref={setNodeRef} className="flex w-full flex-col gap-3 rounded-lg bg-muted/40 p-3" aria-label={TITLES[status]}>
      <header className="flex items-center justify-between px-1">
        <h2 className="font-semibold">{TITLES[status]}</h2>
        <span className="rounded-full bg-muted px-2 text-sm text-muted-foreground">{sorted.length}</span>
      </header>
      <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {sorted.length === 0 ? (
            <EmptyColumn />
          ) : (
            sorted.map((task) => <Card key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />)
          )}
        </div>
      </SortableContext>
    </section>
  );
}
```

- [ ] **Step 4: Schrijf `src/client/components/Board.tsx`**

`onDragEnd` mapt het `over`-target naar `(toStatus, toIndex)`. Een over-target is óf een kaart (dan: de status van die kaart + de index van die kaart), óf een lege kolom-droppable (`col-<status>`, dan index 0). De index wordt afgeleid uit de huidige geordende doelkolom.

```tsx
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
import { Column } from "./Column";
import type { Status, Task } from "@shared/types";
import { STATUSES } from "@shared/types";

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
      accessibility={{ announcements, screenReaderInstructions: { draggable: screenReaderInstructions } }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <Column key={status} status={status} tasks={byStatus(status)} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 5: Vervang `src/client/App.tsx`**

```tsx
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Board } from "@/components/Board";
import { TaskDialog } from "@/components/TaskDialog";
import { DeleteConfirm } from "@/components/DeleteConfirm";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@shared/types";

export default function App() {
  const { tasks, loading, create, edit, move, remove, resetDemo } = useTasks();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backlog Board</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreating(true)}>Nieuwe kaart</Button>
          <Button variant="outline" onClick={() => resetDemo()}>
            Reset demo data
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Laden…</p>
      ) : (
        <Board tasks={tasks} onMove={move} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <TaskDialog
        open={creating}
        mode="create"
        onOpenChange={setCreating}
        onSubmit={async (body) => {
          await create(body);
          setCreating(false);
        }}
      />
      <TaskDialog
        open={editing !== null}
        mode="edit"
        task={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (body) => {
          if (editing) await edit(editing.id, body);
          setEditing(null);
        }}
      />
      <DeleteConfirm
        task={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
          setDeleting(null);
        }}
      />
      <Toaster />
    </main>
  );
}
```

- [ ] **Step 6: Verifieer typecheck (verwacht nog open verwijzingen)**

Run: `bun run typecheck`
Expected: errors over ontbrekende `TaskDialog` en `DeleteConfirm` (die komen in Task 12). Dit is verwacht; los het op in Task 12. De board/column/card/empty-componenten zelf moeten foutloos typechecken.

- [ ] **Step 7: Commit**

```bash
git add src/client/components/Board.tsx src/client/components/Column.tsx src/client/components/Card.tsx src/client/components/EmptyColumn.tsx src/client/App.tsx
git commit -m "feat(client): Board/Column/Card/EmptyColumn met toegankelijke @dnd-kit drag-and-drop"
```

---

### Task 12: TaskDialog (create/edit) en DeleteConfirm 🆕

**Bewijslast (greenfield):** `TaskDialog.tsx` en `DeleteConfirm.tsx` zijn nieuw. Het nieuwe gedrag (één dialog voor create én edit met verplichte titel + prioriteit-select; lichte verwijder-bevestiging) wordt gedemonstreerd door Playwright-stap 2 in Task 13 (nieuwe kaart via dialog verschijnt achteraan in Todo). Blast-radius: dialogen zijn de enige create/edit/delete-ingang in de UI; ze sluiten de openstaande typecheck-fouten uit Task 11.

**Files:**
- Create: `src/client/components/TaskDialog.tsx`
- Create: `src/client/components/DeleteConfirm.tsx`

- [ ] **Step 1: Schrijf `src/client/components/TaskDialog.tsx`**

```tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Priority, Task } from "@shared/types";

interface Submission {
  title: string;
  description: string;
  priority: Priority;
}

export function TaskDialog({
  open,
  mode,
  task,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  task?: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Submission) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "med");
      setError("");
    }
  }, [open, task]);

  function submit() {
    if (title.trim() === "") {
      setError("Titel is verplicht");
      return;
    }
    void onSubmit({ title: title.trim(), description, priority });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nieuwe kaart" : "Kaart bewerken"}</DialogTitle>
          <DialogDescription>Vul de gegevens van de kaart in.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-title">Titel</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wat moet er gebeuren?"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-desc">Beschrijving</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-prio">Prioriteit</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger id="task-prio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Laag</SelectItem>
                <SelectItem value="med">Middel</SelectItem>
                <SelectItem value="high">Hoog</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={submit}>{mode === "create" ? "Toevoegen" : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Schrijf `src/client/components/DeleteConfirm.tsx`**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Task } from "@shared/types";

export function DeleteConfirm({
  task,
  onOpenChange,
  onConfirm,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={task !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kaart verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            "{task?.title}" wordt definitief verwijderd.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>Verwijderen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Verifieer typecheck (nu volledig groen)**

Run: `bun run typecheck`
Expected: geen errors (de openstaande verwijzingen uit Task 11 zijn nu opgelost).

- [ ] **Step 4: Verifieer Biome**

Run: `bun run check`
Expected: geen lint/format-fouten (draai zo nodig `bun run format` en commit de wijziging mee).

- [ ] **Step 5: Commit**

```bash
git add src/client/components/TaskDialog.tsx src/client/components/DeleteConfirm.tsx
git commit -m "feat(client): TaskDialog (create/edit) en DeleteConfirm"
```

---

### Task 13: End-to-end verificatie met Playwright + volledige gates 🔧

**Reproductie/bewijs vóór afronding:** Dit is een hardening/verificatie-task. De "failing test"-equivalent is de live-verificatie: vóór deze task is er geen bewijs dat de geïntegreerde stack daadwerkelijk laadt, sleept, en persisteert. We draaien de vijf Playwright-stappen uit §7 tegen de echte dev-stack; een falende stap (bv. board laadt niet of move persisteert niet over reload) blokkeert afronding tot opgelost. Daarnaast draaien we de volledige LabTech-gates (§6.3).

**Files:**
- Geen productiewijzigingen tenzij een verificatiestap een bug blootlegt (fix dan in het betrokken bestand en commit apart met `fix(...)`).

- [ ] **Step 1: Draai de volledige gate-suite**

```bash
bun run typecheck && bun run check && bun run test
```

Expected: alle drie groen. `bun run test` draait `reorder`, `validation`, `db`, `repo`, `api` en `smoke` — allemaal PASS.

- [ ] **Step 2: Start de dev-stack**

Start `bun run dev` (server 3001 + Vite 5173 met `/api`-proxy) in de achtergrond. Wacht tot beide processen melden dat ze luisteren.

- [ ] **Step 3: Playwright-stap 1 — board laadt met seed-counts**

Navigeer met de Playwright-tool naar `http://localhost:5173`. Maak een snapshot. Verifieer: kolom Todo toont 4 kaarten, Doing 3, Done 3; prioriteit-badges zichtbaar. Expected: counts kloppen.

- [ ] **Step 4: Playwright-stap 2 — nieuwe kaart toevoegen**

Klik "Nieuwe kaart", vul titel "Playwright-verificatie" in, kies prioriteit Hoog, klik "Toevoegen". Verifieer: de kaart verschijnt als laatste in Todo (Todo-count nu 5). Expected: kaart achteraan in Todo.

- [ ] **Step 5: Playwright-stap 3 — toetsenbord-move**

Focus de eerste Todo-kaart (Tab tot de sleep-knop focus heeft), druk Spatie (oppakken), druk pijl-rechts (naar Doing) zo nodig gevolgd door pijl-omlaag, druk Spatie (loslaten). Verifieer via snapshot: de kaart staat nu in Doing. Expected: kaart verplaatst naar Doing.

- [ ] **Step 6: Playwright-stap 4 — page-reload persistentie**

Herlaad de pagina (`browser_navigate` naar dezelfde URL). Verifieer: zowel de nieuwe kaart ("Playwright-verificatie") als de verplaatste kaart staan op hun nieuwe plek. Expected: staat bewaard via SQLite.

- [ ] **Step 7: Playwright-stap 5 — screenshot levendige demo**

Maak een screenshot (`browser_take_screenshot`) naar `docs/superpowers/verificatie/2026-06-02-backlog-board.png`. Verifieer visueel: gevulde kolommen, gekleurde prioriteit-badges, en (na het leegmaken van een kolom via drag) de charmante lege-staat. Stop daarna de dev-stack.

- [ ] **Step 8: Reset de demo voor een schone staat (optioneel maar netjes)**

Klik "Reset demo data" in de UI of POST `/api/seed/reset`. Verifieer: terug op 10 seed-kaarten. Dit dient ook als laatste check op het reset-pad.

- [ ] **Step 9: Commit verificatie-artefact**

```bash
git add docs/superpowers/verificatie/2026-06-02-backlog-board.png
git commit -m "test(e2e): Playwright-verificatie van laad/toevoegen/toetsenbord-move/persistentie + screenshot"
```

Indien een verificatiestap een bug blootlegde en je een productiebestand hebt gewijzigd, commit die fix apart vóór deze stap met een `fix(...)`-message die het symptoom benoemt (bv. `fix(client): KeyboardSensor pakte verkeerde droppable bij lege kolom`).

---

## Self-Review

**1. Spec coverage:**
- §1.1/1.2/1.3/1.4 architectuur, scripts, proxy → Task 1. ✓
- §2.1 types → Task 2. ✓
- §2.2 migratie, §2.3 seed + seed-bij-leeg → Task 3 (schema/seed) + Task 8 (seed-bij-leeg bij opstart). ✓
- §4 pure reorder + alle edge-cases → Task 4 (TDD). ✓
- §3.7 validatie → Task 5 (TDD). ✓
- DB-toegang/repository (§1.1) + §3.2/3.3/3.5-effecten (insert achteraan, update zonder status/position, delete-hercompactie) → Task 6 (TDD). ✓
- §3.1-3.6 endpoints + §3.7 foutpaden incl. malformed JSON → Task 7 (supertest TDD). ✓
- §6.1/6.2 testdekking → Tasks 4-7. ✓
- §5.1 componenten, §5.2 optimistic+rollback, §5.3 toegankelijke DnD → Tasks 9-12. ✓
- §6.3 gates + §7 Playwright-verificatie → Task 13. ✓
- §8 YAGNI → niets toegevoegd buiten scope. ✓

**2. Placeholder scan:** Geen "TBD"/"handle edge cases"/onbenoemde code. Alle code-steps tonen volledige code; commands hebben expected output. Eén bewust verwacht typecheck-falen in Task 11 Step 6 is geen placeholder maar een TDD-volgorde die in Task 12 sluit (expliciet benoemd).

**3. Type consistency:** `reorder(tasks, taskId, toStatus, toIndex)` consistent over server (Task 4), repo (Task 6) en client-hook (Task 10). `TaskRepo`-methodenamen (`listAll`/`insert`/`update`/`move`/`remove`/`reseed`/`getById`) consistent tussen Task 6 en de routes/app in Task 7. `createApp(repo)` neemt een `TaskRepo` (Task 7) en wordt zo aangeroepen in `index.ts` (Task 8) en in `api.test.ts` (Task 7). De `api`-wrapper-methoden (`list/create/update/move/remove/resetDemo`) matchen wat `useTasks` (Task 10) aanroept. `Submission`-shape van `TaskDialog` (Task 12) matcht `CreateTaskBody`/`UpdateTaskBody`-velden die `useTasks.create/edit` (Task 10) verwachten. `parse*Body`-namen consistent tussen Task 5 en Task 7.

Plan compleet.
