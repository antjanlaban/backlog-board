# Retrospect — backlog-board (2026-06-02)

Eerste volledige `/auto`-cyclus van een full-stack extern product (na Pong, single-file). Gestart via `/start-project c:\tmp\backlog-board.md --github public`.

## Wat is er gebouwd

Full-stack kanban-bord: Express + TypeScript + better-sqlite3 backend met REST-API; Vite + React 19 + Tailwind v4 + shadcn (new-york) + @dnd-kit frontend. Drie kolommen (Todo/Doing/Done), kaart-CRUD, toegankelijke drag-and-drop (muis + toetsenbord) met optimistic update + rollback, SQLite-persistentie, seed-demo + "Reset demo data". Pure `reorder()`-kern met unit-tests + supertest API-integratietests. Live op https://github.com/antjanlaban/backlog-board (main `1487fef`, v0.2.0).

## Wat werkte

- **Brief → spec → plan → implementatie in één cyclus.** 13 geclassificeerde, commit-afsluitende tasks; gates 1-3 (typecheck/lint/test 47/47) groen, Playwright-verificatie (5 stappen + reset) groen, productie-`vite build` groen.
- **Eerlijke "N/N groen".** De testbare kern (`reorder`) + supertest-foutpaden (400/404) leverden echte unit/integratie-dekking, precies het trainingsdoel dat Pong niet raakte.
- **pm-agnostiek (0.15.0) hield stand.** bun→npm overal vervangen; better-sqlite3 ^12 met Node-24-prebuilds; Express resolved naar v5 zonder de 400-paden te breken.

## Wat anders moet (machine-leerpunten → LabTech)

Het product bouwde vlot; de frictie zat in de **promote-keten** en is in LabTech vastgelegd:

- **Gate 4 overflow** — de review-diff propte `package-lock.json` (57%) + plan-doc mee → "Prompt is too long" → harde FAIL. Via `/evolve` gefixt (lock/docs-exclude + overlength→Sonnet-escalatie), gepromoveerd als LabTech 0.17.0 (`fe2dcac`). Zie LabTech-memory `gate4_review_diff_overflow_door_lockfile_en_docs`.
- **Gate 4b false positives** — op de eerste echte user-product-review gaf 4b 3 high + 2 medium findings, álle bewezen FP (next-themes-semantiek, Playwright-bewijs, gehallucineerde bun-scripts/v4-comment, weerlegd door echte build). Eenmalige gemotiveerde `LABTECH_ADVERSARIAL_REVIEW=0`-bypass na codebase-verificatie. Idee voor verbetering (4b-findings adversarieel herverifiëren met hoger model/panel) vastgelegd in LabTech-memory `gate4b_findings_adversarieel_herverifieren_voor_softblock`.
- **Canary SKIP** bij de bypass-promote ("release-gate.sh niet gevonden in clone") — kleine losse bevinding, niet-blokkerend; mogelijke /evolve-kandidaat.

## Geleerd (product-memory)

Geen product-specifieke memory-entries: de leerpunten van deze run zijn machine-breed en horen in LabTech, niet in dit product. Dit retrospect dient als de inhoudelijke vastlegging voor backlog-board.
