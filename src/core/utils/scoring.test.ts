import { describe, expect, it } from 'vitest'
import { battlePoints, roundOutcome, teamPoints } from './scoring'

describe('battlePoints', () => {
  it('follows the PDF table', () => {
    const table: [number, number][] = [
      [0, 10], [5, 10], [6, 11], [10, 11], [11, 12], [15, 12], [16, 13], [20, 13],
      [21, 14], [26, 15], [31, 16], [36, 17], [41, 18], [46, 19], [50, 19], [51, 20], [80, 20],
    ]
    for (const [diff, bp] of table) expect(battlePoints(diff).player).toBe(bp)
  })

  it('always totals 20 and mirrors negative differentials (86-54 example)', () => {
    expect(battlePoints(32)).toEqual({ player: 16, opponent: 4 })
    expect(battlePoints(-32)).toEqual({ player: 4, opponent: 16 })
    for (let d = -60; d <= 60; d++) {
      const b = battlePoints(d)
      expect(b.player + b.opponent).toBe(20)
    }
  })
})

describe('roundOutcome', () => {
  it('needs the margin for the team size (54 vs 46 at 5 players is a win)', () => {
    expect(roundOutcome(54, 46, 5)).toBe('win')
    expect(roundOutcome(52, 48, 5)).toBe('draw')
    expect(roundOutcome(46, 54, 5)).toBe('loss')
    expect(roundOutcome(63, 57, 6)).toBe('draw')
    expect(roundOutcome(64, 56, 6)).toBe('win')
  })
  it('awards 3/2/1 team points', () => {
    expect([teamPoints('win'), teamPoints('draw'), teamPoints('loss')]).toEqual([3, 2, 1])
  })
})
