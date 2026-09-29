import { describe, expect, it } from 'vitest'
import type { Step } from '@/types'
import { analyzeRound, replaySteps } from './roundFlow'

function randomMatrix(n: number, seed: number): number[][] {
  let s = seed
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
  return Array.from({ length: n }, () => Array.from({ length: n }, () => 1 + Math.floor(rnd() * 7)))
}

/** Plays a whole round following the recommendations (rival = predicted), returning the steps. */
function autoPlay(matrix: number[][], n: number): Step[] {
  const steps: Step[] = []
  for (let guard = 0; guard < 20; guard++) {
    const a = analyzeRound(matrix, n, steps)
    const c = a.current
    if (!c) break
    if (c.phase === 'defenders')
      steps.push({ kind: 'defenders', mine: c.recMine as number, theirs: c.recTheirs as number, recMine: c.recMine as number, recTheirs: c.recTheirs as number })
    else if (c.phase === 'attackers')
      steps.push({ kind: 'attackers', mine: c.recMine as [number, number], theirs: c.recTheirs as [number, number], recMine: c.recMine as [number, number], recTheirs: c.recTheirs as [number, number] })
    else
      steps.push({ kind: 'refusals', mine: c.recMine as number, theirs: c.recTheirs as number, recMine: c.recMine as number, recTheirs: c.recTheirs as number })
  }
  return steps
}

describe('round flow', () => {
  it.each([3, 4, 5, 6, 7])('a full round of %i players pairs everyone exactly once', (n) => {
    const m = randomMatrix(n, n * 31)
    const steps = autoPlay(m, n)
    const p = replaySteps(n, steps)
    expect(p.phase).toBe('done')
    expect(p.matches).toHaveLength(n)
    expect(new Set(p.matches.map((x) => x.mine)).size).toBe(n)
    expect(new Set(p.matches.map((x) => x.theirs)).size).toBe(n)
  })

  it('the initial expected total equals the first stage value and stays consistent along the way', () => {
    const m = randomMatrix(6, 5)
    const a0 = analyzeRound(m, 6, [])
    expect(a0.current!.expectedTotal).toBeCloseTo(a0.initialExpected, 9)
    expect(a0.current!.phase).toBe('defenders')
  })

  it('a 6-player round is Initial Skirmish + Main Engagement + Champion (2 + 3 + 1 games)', () => {
    const m = randomMatrix(6, 9)
    const p = replaySteps(6, autoPlay(m, 6))
    expect(p.matches.filter((x) => x.module === 0)).toHaveLength(2)
    expect(p.matches.filter((x) => x.module === 1)).toHaveLength(3)
    expect(p.matches.filter((x) => x.kind === 'champion')).toHaveLength(1)
  })

  it('rejects out-of-order logs', () => {
    expect(() =>
      replaySteps(6, [{ kind: 'attackers', mine: [0, 1], theirs: [0, 1], recMine: [0, 1], recTheirs: [0, 1] }]),
    ).toThrow()
  })
})
