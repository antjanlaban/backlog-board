# backlog-board



## Tier

Deze werkmap draait op tier **prod** (zie `.claude/labtech.json`).

- **prod**: geverifieerd werk; merge alleen via `/promote-to-main`.
- **lab**: experiment in worktree; mag stuk.
- **scratch**: vrije speeltuin; alles wegwerp.

Tier wordt niet handmatig geflipt. Code beweegt van lab → prod via `/promote-to-main`.

## Stack (ts-default)

- Runtime: **Bun**
- Test: **Vitest** → `bun test`
- Type-check: **TypeScript** → `bun run typecheck`
- Lint/format: **Biome** → `bun run check`

## Werkstroom

1. Idee → `superpowers:brainstorming` skill (genereert spec in `docs/superpowers/specs/`).
2. Spec → `superpowers:writing-plans` skill (genereert plan).
3. Plan → `/start-experiment <naam>` → `superpowers:executing-plans` of `superpowers:subagent-driven-development` (uitvoeren in worktree).
4. Klaar → `/promote-to-main` (verificatiepoorten + merge naar main).

## Project-conventies

(Initieel leeg. Vul aan met project-specifieke do's/don'ts. Het memory-systeem voegt later automatisch geleerde regels toe — vanaf SP-3.)

## Belangrijke mappen

- `src/` — productiecode
- `tests/` — tests (parallel aan `src/`)
- `docs/superpowers/specs/` — design-documenten
- `.worktrees/` — actieve experimenten (lab-tier)
- `.claude/`
  - `settings.json` — gedeelde baseline (gecommit)
  - `settings.local.json` — tier-overrides (niet gecommit)
  - `labtech.json` — tier-marker (gecommit)

## LabTech-versie

`0.16.0` (zie `.claude/labtech.json`).
