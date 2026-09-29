/** Battle Points from a VP differential (Teams Event Companion, step 14). */
export function battlePoints(vpDifference: number): { player: number; opponent: number } {
  const d = Math.abs(vpDifference)
  const winner = d <= 5 ? 10 : Math.min(20, 10 + Math.ceil((d - 5) / 5))
  const loser = 20 - winner
  if (vpDifference >= 0) return { player: winner, opponent: loser }
  return { player: loser, opponent: winner }
}

/** BP margin a team needs over the other to win the round, by team size. */
export const WIN_MARGIN: Record<number, number> = { 3: 4, 4: 6, 5: 6, 6: 8, 7: 10, 8: 12 }

export type RoundOutcome = 'win' | 'draw' | 'loss'

export function roundOutcome(myBp: number, theirBp: number, teamSize: number): RoundOutcome {
  const margin = WIN_MARGIN[teamSize] ?? 8
  if (myBp - theirBp >= margin) return 'win'
  if (theirBp - myBp >= margin) return 'loss'
  return 'draw'
}

export function teamPoints(outcome: RoundOutcome): number {
  return outcome === 'win' ? 3 : outcome === 'draw' ? 2 : 1
}
