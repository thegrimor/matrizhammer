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
Deployment is up to the owner.

## Decisions already made (do not re-litigate)

- The matrix is **N×N, rows = my players, columns = their players, cell = my 1–7**. N (team size)
  is 3–8, default 6, fixed when an event is created. The rival is strictly zero-sum: their value is
  `8 − x`; there is no separate rival matrix and no per-cell override.
- Cells must **all** be filled before anything is calculated (no neutral default).
- "Optimal" = exact equilibrium (minimax, zero-sum) of the whole multi-module game, maximising the
  **linear sum of the ratings of every game of the round**. The round is really won by a BP margin,
  so this is an approximation; a threshold model is a possible later addition.
- The UI shows only the **recommended option** (the mode of the equilibrium mix) and the
  **predicted rival option** (the mode of the rival's mix) — no percentages, sorting or
  randomiser. The prediction is the equilibrium itself; learning the rival from the step log
  ("option B") is planned but not built — that is why every step stores `recMine`/`recTheirs`.
- Layouts (A/B/C) and secondary missions are not modelled. No event standings/rankings yet, but
  the data (players' faction/disposition, per-game VP results) is stored in a structured way for it.

## Architecture

Layers mirror `cogitador-consulta`: `src/core` (pure logic, no React), `src/features`,
`src/infrastructure`, `src/shared`, `src/store`, `src/types`. `@/` aliases `src/`.

- `core/solver/matrixGame.ts` — zero-sum game solver: pure-saddle check → closed-form 2×2 →
  Bland's-rule simplex (row strategy read from the duals). `value2x2` is the allocation-free hot path.
- `core/solver/pairingGame.ts` — `PairingSolver`: exact backward induction over the pairing modules,
  memoised on `(module, my pool bitmask, their pool bitmask)`. Per module: defenders (simultaneous)
  → attacker pairs (simultaneous, defenders known) → refusals (2×2, simultaneous). In **Initial
  Skirmish** the refused attackers return to the pool; in **Main Engagement** they play each other;
  **Champion** is the last player each. `modulesForTeamSize` encodes the PDF table (3: ME; 4: ME+CH;
  5: IS+ME; 6: IS+ME+CH; 7: IS+IS+ME; 8: IS+IS+ME+CH). 8 players solve in ~1 s.
- `core/solver/roundFlow.ts` — `replaySteps` rebuilds a round's state from its recorded `Step`s
  (never stored: derived, like points in `cogitador-consulta`); `analyzeRound` returns the
  recommendation/prediction for the current phase plus expected totals.
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
- Tailwind only sees full literal class strings — colour lookups (`RATING_CLASSES`, `DISPOSITIONS`)
  are written out literally on purpose.
- Solver tests include a zero-sum consistency check (my value + the opponent-view value = 8n), an
  independent brute force for n=3, and optimality certificates for random games. Keep them green
  when touching `core/solver`.
