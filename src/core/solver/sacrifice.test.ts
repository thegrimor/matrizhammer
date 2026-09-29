import { describe, expect, it } from 'vitest'
import type { Step } from '@/types'
import { uniformRatings } from './pairingGame'
import { analyzeRound, detectSacrifice, MIN_SACRIFICE_DROP, MIN_SACRIFICE_GAIN } from './roundFlow'

const equilibrium = (row: number[], col: number[]) => ({ row, col })

describe('detectSacrifice', () => {
  it('flags a recommendation that looks worse on its own but is worth more', () => {
    // option 0 is recommended (value 5) but looks weak (2); option 1 looks great (5) yet is worth 3.
    const s = detectSacrifice([0, 1], [[5, 5], [3, 3]], equilibrium([1, 0], [1, 0]), [2, 5])
    expect(s).toEqual({ alt: 1, recProspect: 2, altProspect: 5, gain: 2 })
  })

  it('does nothing when the recommendation is also the best-looking option', () => {
    expect(detectSacrifice([0, 1], [[5, 5], [3, 3]], equilibrium([1, 0], [1, 0]), [5, 2])).toBeNull()
  })

  it('needs the recommendation to look clearly worse on its own', () => {
    const drop = MIN_SACRIFICE_DROP - 0.1
    expect(detectSacrifice([0, 1], [[5, 5], [3, 3]], equilibrium([1, 0], [1, 0]), [5 - drop, 5])).toBeNull()
  })

  it('needs a real gain over the best-looking option', () => {
    const gain = MIN_SACRIFICE_GAIN - 0.05
    expect(detectSacrifice([0, 1], [[5, 5], [5 - gain, 5 - gain]], equilibrium([1, 0], [1, 0]), [2, 5])).toBeNull()
  })

  it('weighs each option against the rival’s equilibrium mix, not a single column', () => {
    // column 0 favours option 1, column 1 favours option 0; the rival mixes 50/50.
    const s = detectSacrifice([0, 1], [[2, 8], [6, 1]], equilibrium([1, 0], [0.5, 0.5]), [1, 6])
    expect(s?.gain).toBeCloseTo(5 - 3.5, 9)
  })

  it('works with pairs of attackers as options', () => {
    const s = detectSacrifice([[0, 1], [2, 3]], [[9], [4]], equilibrium([1, 0], [1]), [1, 6])
    expect(s?.alt).toEqual([2, 3])
  })
})

/** Plays a round following the recommendations, collecting each step's analysis. */
function playAndCollect(seed: number, n: number) {
  let s = seed
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => 1 + Math.floor(rnd() * 7)))
  const ratings = uniformRatings(m)
  const steps: Step[] = []
  const seen = []
  for (let guard = 0; guard < 20; guard++) {
    const c = analyzeRound(ratings, n, steps).current
    if (!c) break
    seen.push(c)
    if (c.phase === 'defenders')
      steps.push({ kind: 'defenders', mine: c.recMine as number, theirs: c.recTheirs as number, recMine: c.recMine as number, recTheirs: c.recTheirs as number })
    else if (c.phase === 'attackers')
      steps.push({ kind: 'attackers', mine: c.recMine as [number, number], theirs: c.recTheirs as [number, number], recMine: c.recMine as [number, number], recTheirs: c.recTheirs as [number, number] })
    else steps.push({ kind: 'refusals', mine: c.recMine as number, theirs: c.recTheirs as number, recMine: c.recMine as number, recTheirs: c.recTheirs as number })
  }
  return seen
}

describe('analyzeRound sacrifice', () => {
  it('every reported sacrifice respects the thresholds and passes over a different option', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const n of [3, 4, 5, 6]) {
        for (const c of playAndCollect(seed * 7919 + n, n)) {
          if (!c.sacrifice) continue
          expect(c.sacrifice.gain).toBeGreaterThanOrEqual(MIN_SACRIFICE_GAIN)
          expect(c.sacrifice.altProspect - c.sacrifice.recProspect).toBeGreaterThanOrEqual(MIN_SACRIFICE_DROP)
          expect(c.sacrifice.alt).not.toEqual(c.recMine)
        }
      }
    }
  })

  it('a flat matrix never suggests a sacrifice (nothing looks better or worse)', () => {
    const flat = uniformRatings(Array.from({ length: 6 }, () => new Array<number>(6).fill(4)))
    expect(analyzeRound(flat, 6, []).current?.sacrifice).toBeNull()
  })
})
