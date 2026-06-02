# Changelog

Alle noemenswaardige wijzigingen aan dit project worden in dit bestand vastgelegd.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/),
en dit project volgt [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-06-02

### Added

- Full-stack backlog-board met drie kolommen (Todo / Doing / Done) op `position`-volgorde.
- Kaart-CRUD via dialog: titel (verplicht), beschrijving (optioneel), prioriteit (low/med/high).
- Toegankelijke drag-and-drop (`@dnd-kit`) met pointer- én keyboard-sensor; herorden binnen en
  tussen kolommen met optimistic update + rollback en toast bij API-fout.
- SQLite-persistentie via `better-sqlite3` met idempotente migratie en deterministische seed
  (~10 demo-kaarten) bij eerste opstart.
- REST-API (Express + TypeScript) onder `/api`: `GET/POST/PATCH/DELETE /api/tasks`,
  `POST /api/tasks/:id/move` en `POST /api/seed/reset`, met validatie (400) en 404-foutpaden.
- Pure `reorder(tasks, taskId, toStatus, toIndex)`-functie als testbare kern.
- Levendige demo-UI: gekleurde prioriteit-badges, charmante lege-kolom-staat en
  "Reset demo data"-knop.
- Test-suite (Vitest): unit-tests voor `reorder` en validatie + supertest API-integratietests
  per endpoint inclusief foutpaden; Playwright-verificatie van laden/toevoegen/toetsenbord-move/
  persistentie.
