import type { Step } from '@/types'
import { analyzeRound, PairingSolver, modulesForTeamSize, type RoundAnalysis } from '@/core/solver/roundFlow'
import type { RatingSet } from '@/core/solver/pairingGame'

export interface SolverRequest {
  id: number
  ratings: RatingSet
  teamSize: number
  steps: Step[]
}
export type SolverResponse = { id: number; analysis: RoundAnalysis } | { id: number; error: string }

// The solver memoises the whole game tree for one rating set, so keep it between requests: every
// later step of the same round is then answered from the cache.
let cachedKey = ''
let cachedSolver: PairingSolver | null = null

self.onmessage = (ev: MessageEvent<SolverRequest>) => {
  const { id, ratings, teamSize, steps } = ev.data
  try {
    const key = JSON.stringify(ratings)
    if (key !== cachedKey || !cachedSolver) {
      cachedSolver = new PairingSolver(ratings, modulesForTeamSize(teamSize))
      cachedKey = key
    }
    const analysis = analyzeRound(ratings, teamSize, steps, cachedSolver)
    self.postMessage({ id, analysis } satisfies SolverResponse)
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) } satisfies SolverResponse)
  }
}
