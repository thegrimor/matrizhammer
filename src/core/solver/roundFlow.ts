import type { Step } from '@/types'
import { bits, fullMask, modulesForTeamSize, PairingSolver, recommend, type ModuleKind, type RatingSet } from './pairingGame'

export type Phase = 'defenders' | 'attackers' | 'refusals' | 'done'
export type MatchKind = 'defender' | 'attacker' | 'refused' | 'champion'

export interface Match {
  mine: number
  theirs: number
  kind: MatchKind
  /** Index of the module (0-based) that produced this game. */
  module: number
}

export interface Progress {
  modules: ModuleKind[]
  moduleIndex: number
  poolMine: number
  poolTheirs: number
  phase: Phase
  defenderMine?: number
  defenderTheirs?: number
  attackersMine?: [number, number]
  attackersTheirs?: [number, number]
  matches: Match[]
}

const other = (pair: [number, number], x: number) => (pair[0] === x ? pair[1] : pair[0])

/** Plays a Champion module (one player left each) automatically. */
function settle(p: Progress): void {
  while (p.moduleIndex < p.modules.length && p.modules[p.moduleIndex] === 'CH') {
    const mine = bits(p.poolMine)[0]
    const theirs = bits(p.poolTheirs)[0]
    p.matches.push({ mine, theirs, kind: 'champion', module: p.moduleIndex })
    p.poolMine = 0
    p.poolTheirs = 0
    p.moduleIndex++
  }
  if (p.moduleIndex >= p.modules.length) p.phase = 'done'
}

/** Rebuilds the state of a round by replaying its recorded steps. Throws on an invalid log. */
export function replaySteps(teamSize: number, steps: Step[]): Progress {
  const modules = modulesForTeamSize(teamSize)
  const p: Progress = {
    modules,
    moduleIndex: 0,
    poolMine: fullMask(teamSize),
    poolTheirs: fullMask(teamSize),
    phase: 'defenders',
    matches: [],
  }
  settle(p)
  for (const step of steps) {
    if (step.kind !== p.phase) throw new Error(`Paso ${step.kind} fuera de orden (se esperaba ${p.phase})`)
    const k = p.moduleIndex
    if (step.kind === 'defenders') {
      p.defenderMine = step.mine
      p.defenderTheirs = step.theirs
      p.phase = 'attackers'
    } else if (step.kind === 'attackers') {
      p.attackersMine = step.mine
      p.attackersTheirs = step.theirs
      p.phase = 'refusals'
    } else {
      const d = p.defenderMine!
      const e = p.defenderTheirs!
      const mp = p.attackersMine!
      const tp = p.attackersTheirs!
      const b = step.mine // their attacker my defender plays
      const a = step.theirs // my attacker their defender plays
      p.matches.push({ mine: d, theirs: b, kind: 'defender', module: k })
      p.matches.push({ mine: a, theirs: e, kind: 'attacker', module: k })
      if (p.modules[k] === 'IS') {
        p.poolMine &= ~((1 << d) | (1 << a))
        p.poolTheirs &= ~((1 << e) | (1 << b))
      } else {
        p.matches.push({ mine: other(mp, a), theirs: other(tp, b), kind: 'refused', module: k })
        p.poolMine &= ~((1 << d) | (1 << mp[0]) | (1 << mp[1]))
        p.poolTheirs &= ~((1 << e) | (1 << tp[0]) | (1 << tp[1]))
      }
      p.moduleIndex++
      p.phase = 'defenders'
      p.defenderMine = p.defenderTheirs = undefined
      p.attackersMine = p.attackersTheirs = undefined
      settle(p)
    }
  }
  return p
}

/** Rating of one decided game, using the matrix of whoever picks its map. */
export function matchRating(ratings: RatingSet, m: Match): number {
  if (m.kind === 'defender') return ratings.mine[m.mine][m.theirs]
  if (m.kind === 'attacker') return ratings.theirs[m.mine][m.theirs]
  return ratings.neutral[m.mine][m.theirs]
}

export interface StepAnalysis {
  phase: Exclude<Phase, 'done'>
  moduleKind: ModuleKind
  /** Selectable options for each side: player indices, or pairs of them for `attackers`. */
  mineOptions: (number | [number, number])[]
  theirOptions: (number | [number, number])[]
  recMine: number | [number, number]
  recTheirs: number | [number, number]
  /** Expected total of the whole round (games already fixed + expected value of the rest). */
  expectedTotal: number
}

export interface RoundAnalysis {
  progress: Progress
  /** Expected total of the whole round before any step was played. */
  initialExpected: number
  /** Sum of the ratings of the games already decided. */
  fixedTotal: number
  current: StepAnalysis | null
}

/** Solvers are expensive to warm up (memo), so callers can pass one to reuse across steps. */
export function analyzeRound(
  ratings: RatingSet,
  teamSize: number,
  steps: Step[],
  solver: PairingSolver = new PairingSolver(ratings, modulesForTeamSize(teamSize)),
): RoundAnalysis {
  const progress = replaySteps(teamSize, steps)
  const full = fullMask(teamSize)
  const initialExpected = solver.value(0, full, full)
  const fixedTotal = progress.matches.reduce((s, m) => s + matchRating(ratings, m), 0)
  if (progress.phase === 'done') return { progress, initialExpected, fixedTotal, current: null }

  const k = progress.moduleIndex
  const P = progress.poolMine
  const Q = progress.poolTheirs
  const moduleKind = progress.modules[k]
  let current: StepAnalysis
  if (progress.phase === 'defenders') {
    const st = solver.defenderStage(k, P, Q)
    const r = recommend(st.mineOptions, st.theirOptions, st.game)
    current = {
      phase: 'defenders',
      moduleKind,
      mineOptions: st.mineOptions,
      theirOptions: st.theirOptions,
      recMine: r.mine,
      recTheirs: r.theirs,
      expectedTotal: fixedTotal + st.game.value,
    }
  } else if (progress.phase === 'attackers') {
    const st = solver.attackerStage(k, P, Q, progress.defenderMine!, progress.defenderTheirs!)
    const r = recommend(st.mineOptions, st.theirOptions, st.game)
    current = {
      phase: 'attackers',
      moduleKind,
      mineOptions: st.mineOptions,
      theirOptions: st.theirOptions,
      recMine: r.mine,
      recTheirs: r.theirs,
      expectedTotal: fixedTotal + st.game.value,
    }
  } else {
    const st = solver.refusalStage(
      k,
      P,
      Q,
      progress.defenderMine!,
      progress.defenderTheirs!,
      progress.attackersMine!,
      progress.attackersTheirs!,
    )
    const r = recommend(st.mineOptions, st.theirOptions, st.game)
    current = {
      phase: 'refusals',
      moduleKind,
      mineOptions: st.mineOptions,
      theirOptions: st.theirOptions,
      recMine: r.mine,
      recTheirs: r.theirs,
      expectedTotal: fixedTotal + st.game.value,
    }
  }
  return { progress, initialExpected, fixedTotal, current }
}

export { PairingSolver, modulesForTeamSize }
