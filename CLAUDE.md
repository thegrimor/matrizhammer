# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Maintenance rule

**Update this file as part of the task, not after.** When a task adds a route, a store slice, a
solver stage or changes an architectural pattern below, update the relevant section in the same
change.

## What this is

**Matrizhammer**: a calculator for Warhammer 40,000 *Teams Events* (rules: the Warhammer Teams
Event Companion v1.0, "Pairing system", step 2). The user rates every cross-match of their team
against the opposing team from 1 (bad) to 7 (good) in an N×N matrix; the app computes the optimal
defender / attackers / refusal choices and predicts the rival's. All UI copy is in Spanish.
Sister project: `cogitador-consulta` (same stack and layering; the faction list and Force
Disposition constants were copied from it — there is no runtime dependency between repos).

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build (also emits the PWA service worker)
npm run lint     # ESLint (react-hooks v7 rules are strict: no setState in effects, no mutation in render)
npm run test     # Vitest (core logic only)
```

No backend, no accounts: everything lives in `localStorage` (`matrizhammer-events`, versioned).
Deployment is up to the owner; Netlify works out of the box (`netlify.toml` pins Node 22, and
`public/_redirects` is the SPA fallback — without it every route except `/` 404s on refresh/deep link).

## Decisions already made (do not re-litigate)

- The matrix is **N×N, rows = my players, columns = their players, cell = my 1–7**. N (team size)
  is 3–8, default 6, fixed when an event is created. The rival is strictly zero-sum: their value is
  `8 − x`; there is no separate rival matrix and no manual override of the rival's value.
- Cells of the **main matrix** must all be filled before anything is calculated (no neutral default).
- **Each cell can hold three values in the same square** (`Round.matrix` / `mapMine` / `mapTheirs`),
  because whoever picks the map changes the rating: **main = nobody picks the map** (mandatory),
  **Y = I pick the map**, **R = they pick the map** (both optional; an empty one means "same as main").
  The PDF says each Defender declares the layout of their own game, so the solver reads `mine`
  for my-defender-vs-their-attacker games, `theirs` for their-defender-vs-my-attacker games, and
  `neutral` for the refused-attackers game and the Champion game (layout fixed by the round).
  Still zero-sum: the rival's value for every layer is `8 − x`. `core/utils/ratings.ts`
  (`ratingSets`) resolves the fallback and hands the solver a `RatingSet`. Layout letters A/B/C
  themselves are not modelled — the three values already encode who picks.
- "Optimal" = exact equilibrium (minimax, zero-sum) of the whole multi-module game, maximising the
  **linear sum of the ratings of every game of the round**. The round is really won by a BP margin,
  so this is an approximation; a threshold model is a possible later addition.
- The UI shows only the **recommended option** (the mode of the equilibrium mix) and the
  **predicted rival option** (the mode of the rival's mix) — no percentages, sorting or
  randomiser. The prediction is the equilibrium itself; learning the rival from the step log
  ("option B") is planned but not built — that is why every step stores `recMine`/`recTheirs`.
- Secondary missions are not modelled. No event standings/rankings yet, but
  the data (players' faction/disposition, per-game VP results) is stored in a structured way for it.

## Architecture

Layers mirror `cogitador-consulta`: `src/core` (pure logic, no React), `src/features`,
`src/infrastructure`, `src/shared`, `src/store`, `src/types`. `@/` aliases `src/`.

- `core/solver/matrixGame.ts` — zero-sum game solver: pure-saddle check → closed-form 2×2 →
  Bland's-rule simplex (row strategy read from the duals). `value2x2` is the allocation-free hot path.
- `core/solver/pairingGame.ts` — `RatingSet` (`neutral`/`mine`/`theirs`) and `PairingSolver`: exact backward induction over the pairing modules,
  memoised on `(module, my pool bitmask, their pool bitmask)`. Per module: defenders (simultaneous)
  → attacker pairs (simultaneous, defenders known) → refusals (2×2, simultaneous). In **Initial
  Skirmish** the refused attackers return to the pool; in **Main Engagement** they play each other;
  **Champion** is the last player each. `modulesForTeamSize` encodes the PDF table (3: ME; 4: ME+CH;
  5: IS+ME; 6: IS+ME+CH; 7: IS+IS+ME; 8: IS+IS+ME+CH). 8 players solve in ~1 s.
- `core/solver/roundFlow.ts` — `replaySteps` rebuilds a round's state from its recorded `Step`s
  (never stored: derived, like points in `cogitador-consulta`); `analyzeRound` returns the
  recommendation/prediction for the current phase plus expected totals.
- `features/round/components/AssistantMatrix.tsx` — read-only copy of the matrix inside the assistant:
  players who can no longer be picked (already matched, or not among the current attackers) are
  greyed out, decided games outlined, recommended (green) / predicted (amber) choice highlighted. It is
  a tool for humans: they follow (and can second-guess) the calculation.
- `infrastructure/solver/solver.worker.ts` + `features/round/hooks/useRoundAnalysis.ts` — the solve
  runs in a Web Worker; the worker caches the solver per matrix so later steps are instant.
- `core/utils/scoring.ts` — BP table, win margins per team size, TP (used by the results panel).
- `core/utils/codec.ts` — `sanitizeEvent` (validates ALL untrusted data: localStorage, imports) and
  the export code `MH1:` + lz-string. Any new field on `TeamEvent` must be handled in `sanitizeEvent`.
- `store/eventsSlice.ts` — the only slice; `store/index.ts` persists the events array on change.
- Model: `TeamEvent` → `myTeam: Player[]` + `rounds: Round[]`; a `Round` holds the opponent's
  players, the matrix, the `steps` log and optional per-game VP `results` (`types/index.ts`).

Routes (`core/constants/routes.ts`): `/` events list · `/event/:eventId` team, rounds, export ·
`/event/:eventId/round/:roundId` matrix + round assistant + results (tabs below `lg`, two columns
from `lg`; each panel is rendered once and shown/hidden with CSS).

## Gotchas

- `erasableSyntaxOnly` is on: no class parameter properties, no enums.
- Both matrices (`MatrixGrid`, `AssistantMatrix`) must never scroll horizontally: `w-full table-fixed`, no
  `min-w-*` on cells, names truncated with a fixed player-number prefix (the `title` attribute holds the
  full name). Checked at 360 px with 8 players.
- Tailwind only sees full literal class strings — colour lookups (`RATING_CLASSES`, `DISPOSITIONS`)
  are written out literally on purpose.
- Labels live in `core/utils/labels.ts`. **My players: name first** (`Nombre (Army)` in the assistant's
  dropdowns and boxes). **Rivals: army first** (`Necrons (Bruno)`; matrix headers use the short army name,
  e.g. `CSM`, from `FACTIONS[].short`), because the army tells you far more about a rival than a name.
  Pre-filled names (`Rival 3`, `Jugador 3`) count as placeholders and are hidden next to an army. The
  rivals editor puts the army field before the name.
- Solver tests include a zero-sum consistency check (my value + the opponent-view value = 8n, also with
  three different matrices), a per-layer check (7/1/4 flat sets → known totals), an
  independent brute force for n=3, and optimality certificates for random games. Keep them green
  when touching `core/solver`.
