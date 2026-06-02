# Backlog Board — Design Spec

Status: approved (AI-only brainstorm, user unavailable; decisions taken per LabTech conventions and the opdracht-brief at `docs/superpowers/specs/backlog-board.md`).
Date: 2026-06-02

## Mission

- **Doel:** Bouw een full-stack backlog-board (SPA met Todo/Doing/Done-kolommen) waarin je kaarten aanmaakt, bewerkt, verwijdert en via drag-and-drop (muis + toetsenbord) tussen/binnen kolommen verplaatst, persistent in SQLite via een eigen REST-API.
- **Scope binnen:** Drie kolommen op position-volgorde; kaart-CRUD met prioriteit (low/med/high); toegankelijke drag-and-drop met optimistic update + rollback/toast bij API-fout; SQLite-persistentie via Express-REST-API (GET/POST/PATCH/DELETE /api/tasks, POST /api/tasks/:id/move, POST /api/seed/reset); levendige seed-demo (~10 kaarten, prioriteit-badges, charmante lege-staat, "Reset demo data"-knop); pure reorder(tasks, taskId, toStatus, toIndex)-functie met unit-tests + supertest API-integratietests incl. validatie-foutpaden (400/404).
- **Scope buiten (YAGNI):** Geen auth, geen meerdere borden, geen multi-user, geen real-time sync, geen labels/tags, geen sub-taken, geen due-dates.
- **Succescriterium:** `<pm> run dev` start front- + backend (met /api-proxy); bord laadt met seed-kaarten in de juiste kolommen; kaart toevoegen verschijnt in Todo; verslepen via muis EN toetsenbord werkt; na page-reload staat alles op de juiste plek (SQLite); de reorder-logica heeft echte unit-tests die groen draaien.

---

## 1. Gekozen architectuur

### 1.1 Beslissingen (afgewogen, niet open)

| Beslissing | Keuze | Waarom |
|---|---|---|
| Repo-layout | **Eén package** met `src/server/`, `src/client/`, `src/shared/` — géén workspaces/monorepo-tooling | Eén `package.json`, één `tsconfig`-basis, geen Turbo/PNPM-workspaces. Twee lagen, één install. Workspaces zijn scope-creep voor één spec-cyclus. |
| Dev-orchestratie | **`concurrently`** draait Vite + Express (`tsx watch`) náást elkaar; Vite proxyt `/api` | Behoudt HMR voor de frontend en losse server-herstart. "Eén Express die de Vite-build serveert" complicéért dev (geen HMR) en is alleen in prod nuttig — buiten scope. |
| DB-toegang | **Dunne repository-laag** (`src/server/db/repo.ts`) met prepared statements rond `better-sqlite3` | SQL blijft buiten route-handlers; `reorder` blijft puur en los testbaar; geen ORM (YAGNI). |
| Positie-strategie | **Dichte integers (0..n-1)** met herberekening via pure `reorder` | De brief schrijft "herberekent de positie" + een pure functie die de hele geordende lijst teruggeeft. Fractionele indexing is overbodige complexiteit hier. |
| Server-runtime in dev | **`tsx watch`** op de Express-entry | Runtime-agnostisch, vermijdt native-module-frictie; `better-sqlite3` laadt betrouwbaar onder Node/tsx. |
| Package manager / `<pm>` | **Bun** (zoals scaffold `CLAUDE.md`); scripts draaien als `bun run <script>` | Conventie uit de werkmap. `better-sqlite3` werkt onder Bun node-compat. |

### 1.2 Directory-structuur

```
backlog-board/
├─ package.json                 # scripts: dev / dev:client / dev:server / build / test / typecheck / check
├─ tsconfig.json                # bestaande basis (strict); include src/** tests/**
├─ tsconfig.client.json         # extends basis; lib DOM, jsx react-jsx, types vite/client
├─ vite.config.ts               # root=src/client, /api-proxy → http://localhost:3001
├─ vitest.config.ts             # twee projecten: node (server/shared) + jsdom (client) — of enkel node indien geen client-tests
├─ index.html                   # Vite entry (in src/client/ of root; zie vite root)
├─ biome.json                   # bestaand
├─ data/                        # SQLite-bestand (gitignored), bv. data/backlog.db
├─ src/
│  ├─ shared/
│  │  └─ types.ts               # Task, Status, Priority, request/response-shapes (single source of truth)
│  ├─ server/
│  │  ├─ index.ts               # Express-app start, luistert op PORT (default 3001)
│  │  ├─ app.ts                 # createApp(db) → Express instance (zonder listen) — voor supertest
│  │  ├─ db/
│  │  │  ├─ connection.ts       # openDb(path) → better-sqlite3 Database; PRAGMA's
│  │  │  ├─ migrate.ts          # ensureSchema(db): CREATE TABLE IF NOT EXISTS
│  │  │  ├─ seed.ts             # SEED_TASKS (~10) + reseed(db): wipe + insert
│  │  │  └─ repo.ts             # TaskRepo: listAll / insert / update / move / remove / reseed
│  │  ├─ routes/
│  │  │  └─ tasks.ts            # router voor /api/tasks*, /api/seed/reset
│  │  ├─ reorder.ts             # PURE reorder(tasks, taskId, toStatus, toIndex) -> Task[]
│  │  └─ validation.ts          # input-guards → ValidationError (400)
│  └─ client/
│     ├─ main.tsx               # React 19 root
│     ├─ App.tsx                # data-fetch + state + toaster
│     ├─ index.css              # Tailwind v4 entry (@import "tailwindcss")
│     ├─ lib/
│     │  ├─ api.ts              # fetch-wrapper rond /api
│     │  └─ utils.ts            # cn() (shadcn)
│     ├─ components/
│     │  ├─ Board.tsx           # DndContext + 3 kolommen
│     │  ├─ Column.tsx          # droppable kolom + SortableContext
│     │  ├─ Card.tsx            # useSortable kaart + prioriteit-badge
│     │  ├─ TaskDialog.tsx      # create/edit form (shadcn Dialog + Form)
│     │  ├─ DeleteConfirm.tsx   # shadcn AlertDialog (lichte bevestiging)
│     │  ├─ EmptyColumn.tsx     # charmante lege-staat
│     │  └─ ui/                 # shadcn new-york primitives (button, dialog, badge, input, …)
│     └─ hooks/
│        └─ useTasks.ts         # laden, optimistic move/create/edit/delete + rollback
└─ tests/
   ├─ reorder.test.ts          # unit-tests pure reorder (alle edge-cases)
   └─ api.test.ts              # supertest-integratie per endpoint incl. 400/404
```

### 1.3 Package-scripts (`package.json`)

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

Nieuwe dependencies: `express`, `better-sqlite3`, `uuid` (of `crypto.randomUUID`), `react`, `react-dom`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`. Dev: `vite`, `@vitejs/plugin-react`, `tsx`, `concurrently`, `tailwindcss`, `@tailwindcss/vite`, `supertest`, `@types/express`, `@types/better-sqlite3`, `@types/supertest`, `@types/react`, `@types/react-dom`. shadcn/ui new-york primitives via de shadcn-CLI gegenereerd in `src/client/components/ui/`.

### 1.4 Dev-orchestratie & proxy

- Vaste backend-poort: **3001** (`PORT`-env override mogelijk; default 3001).
- Vite dev-server: **5173** (default).
- `vite.config.ts` proxy:

```ts
server: {
  proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } }
}
```

Frontend praat altijd met relatieve `/api/...`-URLs; in dev gaat dat via de proxy, los van poorten.

---

## 2. Datamodel & DB

### 2.1 Task (`src/shared/types.ts`)

```ts
export type Status = "todo" | "doing" | "done";
export type Priority = "low" | "med" | "high";

export interface Task {
  id: string;            // uuid v4
  title: string;         // verplicht, non-empty na trim
  description: string;   // optioneel → "" als leeg (kolom NOT NULL DEFAULT '')
  status: Status;
  priority: Priority;
  position: number;      // 0-based, dicht binnen (status)
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}

export const STATUSES: Status[] = ["todo", "doing", "done"];
export const PRIORITIES: Priority[] = ["low", "med", "high"];
```

### 2.2 Schema-migratie (`migrate.ts`)

`ensureSchema(db)` draait bij elke server-opstart, idempotent:

```sql
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
```

PRAGMA's in `connection.ts`: `journal_mode = WAL`, `foreign_keys = ON`. Connectie is synchroon (`better-sqlite3`), dus geen async in de repo.

### 2.3 Seed-strategie (`seed.ts`)

- `SEED_TASKS`: ~10 realistische kaarten verdeeld over de kolommen met afwisselende prioriteiten (bv. Todo 4, Doing 3, Done 3), `position` dicht per kolom, `createdAt`/`updatedAt` = vaste ISO-stamps zodat de demo deterministisch is.
- **Seed-bij-leeg:** na `ensureSchema` controleert opstart `SELECT COUNT(*) FROM tasks`; is dat 0, dan `reseed(db)`.
- `reseed(db)`: in één transactie `DELETE FROM tasks` gevolgd door inserts van `SEED_TASKS`. Gebruikt door zowel opstart-seed als `POST /api/seed/reset`.

---

## 3. API-endpoints

Basis: `/api`. Alle responses JSON. `Task` exact zoals §2.1. Fouten: `{ "error": "<message>" }` met passende status.

### 3.1 `GET /api/tasks`
- **200** → `Task[]`, gesorteerd `ORDER BY status, position` (front-end groepeert per kolom).

### 3.2 `POST /api/tasks`
- Body: `{ title: string; description?: string; priority?: Priority }`.
- Validatie: `title` non-empty na trim → anders **400**. `priority` indien aanwezig in enum → anders **400**. `priority` default `"med"`.
- Effect: nieuwe `Task`, `status="todo"`, `position = (max position in todo) + 1`, nieuwe uuid, `createdAt=updatedAt=now`.
- **201** → de aangemaakte `Task`.

### 3.3 `PATCH /api/tasks/:id`
- Body (alle optioneel): `{ title?: string; description?: string; priority?: Priority }`.
- Validatie: onbekend `id` → **404**. Indien `title` aanwezig: non-empty na trim → anders **400**. Indien `priority` aanwezig: in enum → anders **400**. Lege body is toegestaan (no-op, `updatedAt` ververst). `status`/`position` worden hier **niet** gewijzigd (daarvoor is `/move`).
- Effect: gegeven velden bijwerken, `updatedAt=now`.
- **200** → de bijgewerkte `Task`.

### 3.4 `POST /api/tasks/:id/move`
- Body: `{ status: Status; position: number }` (= `toStatus`, `toIndex`).
- Validatie: onbekend `id` → **404**. `status` in enum → anders **400**. `position` is een integer `>= 0` → anders **400** (out-of-range index wordt geclampt naar het einde van de doelkolom, geen fout).
- Effect (in één transactie): laad alle tasks → `reorder(tasks, id, status, position)` → persisteer elke task waarvan `status` of `position` veranderde (`updatedAt=now` voor de verplaatste task).
- **200** → de volledige nieuwe `Task[]` (zelfde shape als `GET`), zodat de client desgewenst de hele staat kan vervangen.

### 3.5 `DELETE /api/tasks/:id`
- Validatie: onbekend `id` → **404**.
- Effect (transactie): verwijder de task, herbereken (dicht) de `position` van de resterende tasks in de bronkolom.
- **204** → geen body.

### 3.6 `POST /api/seed/reset`
- Effect: `reseed(db)`.
- **200** → de volledige nieuwe `Task[]`.

### 3.7 Validatieregels samengevat
- **400**: lege/whitespace-only titel; `status` of `priority` buiten enum; `position` geen integer of `< 0`; ontbrekende verplichte body-velden bij `/move`.
- **404**: `:id` bestaat niet (PATCH, move, DELETE).
- Body-parsing via `express.json()`; malformed JSON → **400** (Express error-handler).

---

## 4. De pure kern: `reorder`

`src/server/reorder.ts` — geen import van Express of better-sqlite3.

```ts
export function reorder(
  tasks: Task[],
  taskId: string,
  toStatus: Status,
  toIndex: number,
): Task[];
```

### Contract
1. **Puur**: muteert de input niet; geeft een nieuwe array van (kopie-)Task-objecten terug.
2. Vindt de task met `taskId`. Bestaat die niet → gooit een `Error` (de route-laag heeft `id`-bestaan al als 404 afgevangen; dit is een interne invariant).
3. Verwijdert de task uit zijn huidige (status-)kolom en voegt hem in de `toStatus`-kolom in op `toIndex`.
4. `toIndex` wordt geclampt naar `[0, lengte van doelkolom na verwijderen]`. Negatief → 0; te groot → achteraan.
5. Hernummert **dicht** (0..n-1) de `position` van élke kolom die wijzigde (bron én doel; bij same-column move alleen die ene).
6. Zet `status` van de verplaatste task op `toStatus`.
7. Volgorde van de teruggegeven array is irrelevant voor het contract zolang per `(status)` de `position` dicht en correct is; conventioneel sorteren we `status` dan `position`.

### Te dekken edge-cases (unit-tests)
- Herorden **omhoog** binnen dezelfde kolom (van index 3 → 1).
- Herorden **omlaag** binnen dezelfde kolom (van index 1 → 3) — let op de index-shift na verwijderen.
- Verplaatsen naar een **lege** kolom (`toIndex` 0).
- Naar de **eerste** positie van een niet-lege kolom (`toIndex` 0).
- Naar de **laatste** positie (`toIndex >= lengte` → clamp achteraan).
- **No-op**: zelfde status, zelfde effectieve index → resultaat-posities ongewijzigd.
- `toIndex` negatief of te groot → geclampt, geen exception.
- Posities blijven na elke operatie **dicht en uniek** per kolom (invariant-assert).

---

## 5. Frontend

React 19 + TypeScript + Tailwind v4 + shadcn/ui (new-york) + `@dnd-kit`.

### 5.1 Componentstructuur
- **`App.tsx`** — laadt `GET /api/tasks` bij mount, houdt `tasks`-state, rendert `Board`, de `TaskDialog`-trigger ("Nieuwe kaart"), "Reset demo data"-knop, en de shadcn `Toaster` (sonner of toast). Delegeert mutaties aan `useTasks`.
- **`Board.tsx`** — `DndContext` met **PointerSensor** én **KeyboardSensor** (`sortableKeyboardCoordinates`). Rendert drie `Column`s in vaste volgorde todo/doing/done. `onDragEnd` mapt het `over`-target naar `(toStatus, toIndex)` en roept `useTasks.move`.
- **`Column.tsx`** — kolom-droppable + `SortableContext` (verticale strategie) met de gefilterde+gesorteerde kaarten; toont `EmptyColumn` als leeg; kolomkop met titel en count.
- **`Card.tsx`** — `useSortable`-kaart; toont titel, (optioneel) beschrijving, gekleurde **prioriteit-badge** (low/med/high → eigen kleur), bewerk- en verwijder-actie. Soepele drag-animatie via `@dnd-kit/utilities` `CSS.Transform`.
- **`TaskDialog.tsx`** — shadcn `Dialog` + form (titel verplicht, beschrijving optioneel, prioriteit-select). Eén component voor create én edit (mode via props).
- **`DeleteConfirm.tsx`** — shadcn `AlertDialog` voor de lichte verwijder-bevestiging.
- **`EmptyColumn.tsx`** — charmante lege-staat (illustratie/emoji + tekst).

### 5.2 Optimistic update + rollback (`hooks/useTasks.ts`)
- Elke mutatie (`create`, `edit`, `move`, `delete`, `resetDemo`) past **eerst** de lokale `tasks`-state aan (optimistic), bewaart een snapshot, en vuurt dan de API-call.
- **move**: lokaal dezelfde `reorder`-semantiek toepassen (de client mag `src/shared` desgewenst importeren of een lichte client-variant gebruiken) → directe, soepele UI; bij succes vervangt de server-response `Task[]` de state (autoritatief); bij **fout** → snapshot terugzetten + `toast.error(...)`.
- `lib/api.ts` gooit bij `!res.ok` met de servermelding zodat de hook de rollback + toast triggert.

### 5.3 Toegankelijke drag-and-drop
- KeyboardSensor: focus kaart (Tab) → **Spatie** (pak op) → **pijltjes** (verplaats) → **Spatie** (laat los). Dit is het exacte pad uit de Playwright-verificatie.
- `@dnd-kit` `announcements`/`screenReaderInstructions` met NL-teksten voor toegankelijkheid.

---

## 6. Test-strategie

Testrunner: **Vitest** (past bij Vite/TS, al in de scaffold).

### 6.1 Unit — `tests/reorder.test.ts`
Dekt alle edge-cases uit §4: omhoog/omlaag binnen kolom, lege kolom, eerste/laatste positie, no-op, clamping, en de dicht-&-uniek-invariant. Pure functie, geen mocks, geen DB.

### 6.2 Integratie — `tests/api.test.ts` (supertest)
- `createApp(db)` met een **in-memory** SQLite (`new Database(":memory:")`), `ensureSchema` + `reseed` per test (`beforeEach`) voor isolatie.
- Per endpoint een happy-path + de foutpaden:
  - `GET /api/tasks` → 200, seed-aantal, gesorteerd.
  - `POST /api/tasks` → 201; **400** bij lege titel en bij ongeldige `priority`; nieuwe kaart staat achteraan in todo.
  - `PATCH /api/tasks/:id` → 200; **404** onbekend id; **400** lege titel / ongeldige priority.
  - `POST /api/tasks/:id/move` → 200 + correcte nieuwe ordening; **404** onbekend id; **400** ongeldige status / negatieve position.
  - `DELETE /api/tasks/:id` → 204; **404** onbekend id; resterende posities dicht.
  - `POST /api/seed/reset` → 200, staat terug op seed.

### 6.3 Gates (LabTech prod)
`bun run typecheck`, `bun run check` (Biome), `bun run test` — alle groen vóór `/promote-to-main` (hard-block release-gate).

---

## 7. Verificatie-strategie (Playwright, 5 stappen uit de brief)

1. **Board laadt** met de seed-kaarten zichtbaar in de juiste kolommen (snapshot bevestigt counts per kolom).
2. **Nieuwe kaart toevoegen** via de dialog → verschijnt achteraan in **Todo**.
3. **Toetsenbord-move**: focus een Todo-kaart → **Spatie** → **pijl-rechts/omlaag** → **Spatie** → de kaart staat daarna in **Doing**.
4. **Page-reload** → de verplaatsing én de nieuwe kaart zijn bewaard (SQLite-persistentie geverifieerd).
5. **Screenshot** voor de "levendige demo"-check (prioriteit-badges, gevulde kolommen, nette lege-staat indien van toepassing).

Uitgevoerd tegen `bun run dev` (backend 3001 + Vite 5173 met `/api`-proxy).

---

## 8. Buiten scope (YAGNI)

Geen authenticatie, geen meerdere borden, geen multi-user, geen real-time sync (geen websockets/polling), geen labels/tags, geen sub-taken, geen due-dates, geen drag-and-drop tussen méér dan de drie vaste kolommen, geen ORM/migratie-framework, geen workspace/monorepo-tooling, geen productie-deploy (alleen `dev` + lokale verificatie). Deze voegen losse subsystemen toe zonder de machine méér te trainen en passen niet in één spec-cyclus.
