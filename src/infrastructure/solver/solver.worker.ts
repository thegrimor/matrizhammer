import type { Step } from '@/types'
import { analyzeRound, PairingSolver, modulesForTeamSize, type RoundAnalysis } from '@/core/solver/roundFlow'

export interface SolverRequest {
  id: number
  matrix: number[][]
  teamSize: number
  steps: Step[]
}
export type SolverResponse = { id: number; analysis: RoundAnalysis } | { id: number; error: string }

// The solver memoises the whole game tree for one matrix, so keep it between requests: every
// later step of the same round is then answered from the cache.
let cachedKey = ''
let cachedSolver: PairingSolver | null = null

self.onmessage = (ev: MessageEvent<SolverRequest>) => {
  const { id, matrix, teamSize, steps } = ev.data
  try {
    const key = JSON.stringify(matrix)
    if (key !== cachedKey || !cachedSolver) {
      cachedSolver = new PairingSolver(matrix, modulesForTeamSize(teamSize))
      cachedKey = key
    }
    const analysis = analyzeRound(matrix, teamSize, steps, cachedSolver)
    self.postMessage({ id, analysis } satisfies SolverResponse)
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) } satisfies SolverResponse)
  }
}
