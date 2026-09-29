import type { Rating, Round } from '@/types'
import type { RatingSet } from '@/core/solver/pairingGame'

/** Which of a round's three matrices a rating belongs to. */
export type RatingLayer = 'neutral' | 'mine' | 'theirs'

export const LAYER_FIELD = { neutral: 'matrix', mine: 'mapMine', theirs: 'mapTheirs' } as const

export const LAYER_LABELS: Record<RatingLayer, string> = {
  neutral: 'Nadie elige',
  mine: 'Elijo yo',
  theirs: 'Elige el rival',
}

export function isComplete(matrix: Rating[][]): boolean {
  return matrix.every((row) => row.every((v) => v !== null))
}

/**
 * The three matrices as numbers, ready for the solver, or null while the main matrix is
 * incomplete. An empty cell in `mapMine`/`mapTheirs` falls back to the main value.
 */
export function ratingSets(round: Round): RatingSet | null {
  if (!isComplete(round.matrix)) return null
  const neutral = round.matrix as number[][]
  const resolve = (over: Rating[][]) => over.map((row, i) => row.map((v, j) => v ?? neutral[i][j]))
  return { neutral, mine: resolve(round.mapMine), theirs: resolve(round.mapTheirs) }
}
