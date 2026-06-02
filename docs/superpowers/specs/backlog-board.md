# Backlog Board

Een levendig kanban-bordje voor het beheren van een persoonlijke backlog: kaarten in drie
kolommen (Todo / Doing / Done), met drag-and-drop, prioriteiten en persistentie.

Dit is het tweede échte externe product gebouwd met LabTech (na Pong). Het doel is zowel een
nuttig, af ogend bordje opleveren als de LabTech-machine trainen op nieuwe dimensies:
een echte API-laag, een SQLite-database, en een serieuze test-suite.

## Mission

Bouw een full-stack backlog-board: een single-page webapp met drie kolommen (Todo, Doing, Done)
waarin je taken aanmaakt, bewerkt, verwijdert en via drag-and-drop tussen en binnen kolommen
verplaatst. De volgorde en status worden persistent opgeslagen in een SQLite-database via een
eigen REST-API. De app opent met een gevulde, levendige demo en ziet er meteen af uit.

Succes betekent: `<pm> run dev` start frontend + backend, het bord laadt met seed-kaarten, je
kunt een kaart toevoegen en met de muis óf het toetsenbord verslepen, en na een page-reload staat
alles nog op de juiste plek. De backend-logica voor het herordenen heeft echte unit-tests die
groen draaien.

## Achtergrond & doel

- **Product:** een persoonlijk backlog-bord. Eén bord, geen accounts, geen multi-user.
- **Trainingsdoel voor LabTech:** dit product raakt expres gates en paden die Pong (single-file
  browser-canvas-game) niet raakte — een aparte API-laag, een database met migratie/seed,
  cross-layer build, server-opstart-verificatie, en een unit-/integratie-test-suite die een
  eerlijke "N/N groen" produceert.

## Functionele requirements

1. **Drie kolommen** — Todo, Doing, Done. Elke kolom toont zijn kaarten op `position`-volgorde.
2. **Kaart aanmaken** — via een dialog/form: titel (verplicht), beschrijving (optioneel),
   prioriteit (low/med/high). Nieuwe kaart komt achteraan in Todo.
3. **Kaart bewerken** — titel, beschrijving en prioriteit aanpassen.
4. **Kaart verwijderen** — met een lichte bevestiging.
5. **Drag-and-drop** — een kaart slepen binnen een kolom (herordenen) en tussen kolommen
   (status verandert). Werkt met muis én toetsenbord (toegankelijk). Optimistic update met
   rollback + toast bij API-fout.
6. **Persistentie** — alles overleeft een page-reload (opgeslagen in SQLite).
7. **Levendige demo** — bij eerste opstart een seed van ~10 realistische kaarten verdeeld over de
   kolommen; gekleurde prioriteit-badges; soepele drag-animaties; een charmante lege-kolom-staat;
   en een "Reset demo data"-knop die terugzet naar de seed.

## Architectuur

Eén repo, twee duidelijke lagen.

- **Backend** — Express + TypeScript + `better-sqlite3` (synchroon → makkelijk testbaar).
  REST-API onder `/api`. Eén tabel `tasks`. Bij opstart: migratie (tabel aanmaken indien nodig)
  en seed indien leeg.
- **Frontend** — Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (new-york-stijl),
  `@dnd-kit` voor drag-and-drop (pointer- én keyboard-sensor). Vite dev-proxy stuurt `/api`
  door naar de backend.

### Datamodel

```
Task {
  id: string            // uuid
  title: string         // verplicht, niet leeg
  description: string?  // optioneel
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'med' | 'high'
  position: number      // volgorde binnen de kolom (status)
  createdAt: string     // ISO
  updatedAt: string     // ISO
}
```

### API-endpoints

- `GET /api/tasks` — alle taken, geordend per kolom op `position`.
- `POST /api/tasks` — nieuwe taak (default status `todo`, achteraan in de kolom).
- `PATCH /api/tasks/:id` — titel / beschrijving / prioriteit wijzigen.
- `POST /api/tasks/:id/move` — body `{ status, position }`: verplaatst de taak en herberekent de
  `position` in zowel bron- als doelkolom.
- `DELETE /api/tasks/:id` — verwijdert de taak en herberekent de posities in de kolom.
- `POST /api/seed/reset` — wist en herseed de demo-data (voor de "Reset demo data"-knop).

### De testbare kern

De positie-herberekening bij een move moet een **pure functie** zijn, los van Express en SQLite:

```
reorder(tasks, taskId, toStatus, toIndex) -> Task[]   // de nieuwe, geordende lijst
```

Hierop komen echte unit-tests met edge-cases: herorden binnen dezelfde kolom (omhoog en omlaag),
naar een lege kolom, naar de eerste en de laatste positie, en een no-op move. Daarnaast
API-integratietests met `supertest` voor elk endpoint (incl. de validatie-foutpaden).

## Foutafhandeling

- API valideert input: titel niet leeg, `status` en `priority` binnen hun enum → anders `400`.
- Onbekend `id` → `404`.
- Frontend toont een toast bij een API-fout en rolt de optimistic update terug.

## Run- & verificatie-strategie

- `<pm> run dev` start backend (vaste poort) + frontend dev-server (met `/api`-proxy).
- Playwright-verificatie:
  1. Board laadt met de seed-kaarten zichtbaar in de juiste kolommen.
  2. Nieuwe kaart toevoegen verschijnt in Todo.
  3. Een kaart via het toetsenbord (focus → spatie → pijl → spatie) van Todo naar Doing
     verplaatsen; de kaart staat daarna in Doing.
  4. Page-reload: de verplaatsing en de nieuwe kaart zijn bewaard (SQLite).
  5. Screenshot voor de "levendige demo"-check.

## Buiten scope (YAGNI)

Geen authenticatie, geen meerdere borden, geen multi-user, geen real-time sync, geen labels/tags,
geen sub-taken, geen due-dates. Die voegen losse subsystemen toe zonder de machine méér te trainen
en passen niet in één spec-cyclus.
