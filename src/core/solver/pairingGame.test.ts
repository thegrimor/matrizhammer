import { describe, expect, it } from 'vitest'
import { modulesForTeamSize, fullMask, PairingSolver, uniformRatings, type RatingSet } from './pairingGame'

function rootValue(ratings: number[][] | RatingSet): number {
  const set = Array.isArray(ratings) ? uniformRatings(ratings) : ratings
  const n = set.neutral.length
  const s = new PairingSolver(set, modulesForTeamSize(n))
  return s.value(0, fullMask(n), fullMask(n))
}

const flat = (n: number, v: number) => Array.from({ length: n }, () => new Array<number>(n).fill(v))

/** Opponent's own rating set under the zero-sum rule (their "they pick" is my "I pick", flipped). */
function opponentSet(r: RatingSet): RatingSet {
  const flip = (m: number[][]) => m.map((_, j) => m.map((row) => 8 - row[j]))
  return { neutral: flip(r.neutral), mine: flip(r.theirs), theirs: flip(r.mine) }
}

function randomMatrix(n: number, seed: number): number[][] {
  let s = seed
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
  return Array.from({ length: n }, () => Array.from({ length: n }, () => 1 + Math.floor(rnd() * 7)))
}

/** The opponent's own matrix under the zero-sum rule: their rating of (their j vs my i) = 8 − mine. */
function opponentView(matrix: number[][]): number[][] {
  const n = matrix.length
  return Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => 8 - matrix[i][j]))
}

describe('modulesForTeamSize', () => {
  it('follows the Teams Event Companion table', () => {
    expect(modulesForTeamSize(3)).toEqual(['ME'])
    expect(modulesForTeamSize(4)).toEqual(['ME', 'CH'])
    expect(modulesForTeamSize(5)).toEqual(['IS', 'ME'])
    expect(modulesForTeamSize(6)).toEqual(['IS', 'ME', 'CH'])
    expect(modulesForTeamSize(7)).toEqual(['IS', 'IS', 'ME'])
    expect(modulesForTeamSize(8)).toEqual(['IS', 'IS', 'ME', 'CH'])
    expect(() => modulesForTeamSize(9)).toThrow()
  })
})

describe('PairingSolver', () => {
  it('a flat matrix is worth n × rating whatever the size', () => {
    for (let n = 3; n <= 8; n++) {
      const flat = Array.from({ length: n }, () => new Array(n).fill(5))
      expect(rootValue(flat)).toBeCloseTo(5 * n, 9)
    }
  })

  it('when a rating depends only on my player, every pairing is worth the same', () => {
    for (let n = 3; n <= 8; n++) {
      const r = Array.from({ length: n }, (_, i) => 1 + (i % 7))
      const m = r.map((x) => new Array(n).fill(x))
      expect(rootValue(m)).toBeCloseTo(r.reduce((s, x) => s + x, 0), 9)
    }
  })

  it('when a rating depends only on their player, every pairing is worth the same', () => {
    for (let n = 3; n <= 8; n++) {
      const c = Array.from({ length: n }, (_, j) => 1 + ((j * 3) % 7))
      const m = Array.from({ length: n }, () => [...c])
      expect(rootValue(m)).toBeCloseTo(c.reduce((s, x) => s + x, 0), 9)
    }
  })

  it('is zero-sum consistent: my value + the opponent-view value = 8n', () => {
    for (const n of [3, 4, 5, 6, 7]) {
      for (let seed = 1; seed <= 3; seed++) {
        const m = randomMatrix(n, seed * 97 + n)
        expect(rootValue(m) + rootValue(opponentView(m))).toBeCloseTo(8 * n, 6)
      }
    }
  })

  it('matches an independent brute force on a 3-player case', () => {
    // Main Engagement only; brute3 solves each stage with an exhaustive mixed-strategy grid
    // search instead of the production solver.
    const M = [
      [7, 4, 4],
      [4, 4, 4],
      [4, 4, 4],
    ]
    expect(rootValue(M)).toBeCloseTo(brute3(M), 9)
    const R = [
      [7, 2, 5],
      [1, 6, 3],
      [4, 4, 7],
    ]
    expect(rootValue(R)).toBeCloseTo(brute3(R), 2)
    const A = [
      [7, 2, 5],
      [1, 6, 3],
      [4, 4, 7],
    ]
    const B = [
      [2, 6, 1],
      [5, 3, 6],
      [7, 1, 2],
    ]
    expect(rootValue({ neutral: R, mine: A, theirs: B })).toBeCloseTo(brute3(R, A, B), 2)
  })

  it('who picks the map decides which matrix each game reads', () => {
    // neutral 4, "I pick" 7, "they pick" 1. Every game is one of: my defender vs their attacker
    // (7), their defender vs my attacker (1), or a refused/champion game (4).
    const set: RatingSet = { neutral: flat(3, 4), mine: flat(3, 7), theirs: flat(3, 1) }
    expect(rootValue(set)).toBeCloseTo(7 + 1 + 4, 9) // ME: 2 defender games + 1 refused game
    const six: RatingSet = { neutral: flat(6, 4), mine: flat(6, 7), theirs: flat(6, 1) }
    // IS: 7+1 · ME: 7+1+4 · Champion: 4
    expect(rootValue(six)).toBeCloseTo(8 + 12 + 4, 9)
    const eight: RatingSet = { neutral: flat(8, 4), mine: flat(8, 7), theirs: flat(8, 1) }
    // IS×2: 8+8 · ME: 12 · Champion: 4
    expect(rootValue(eight)).toBeCloseTo(16 + 12 + 4, 9)
  })

  it('with equal matrices the result is the same as before per-map ratings existed', () => {
    const m = randomMatrix(5, 11)
    expect(rootValue({ neutral: m, mine: m.map((r) => [...r]), theirs: m.map((r) => [...r]) })).toBeCloseTo(rootValue(m), 9)
  })

  it('stays zero-sum consistent with three different matrices', () => {
    for (const n of [3, 4, 5, 6]) {
      const set: RatingSet = { neutral: randomMatrix(n, n + 1), mine: randomMatrix(n, n + 2), theirs: randomMatrix(n, n + 3) }
      expect(rootValue(set) + rootValue(opponentSet(set))).toBeCloseTo(8 * n, 6)
    }
  })

  it('choosing the map can change the optimum (a pure "I pick" bonus is worth taking)', () => {
    const base: RatingSet = { neutral: flat(4, 4), mine: flat(4, 4), theirs: flat(4, 4) }
    const withBonus: RatingSet = { ...base, mine: flat(4, 6) }
    expect(rootValue(withBonus)).toBeGreaterThan(rootValue(base))
  })

  it('exposes the stage strategies used by the wizard', () => {
    const m = randomMatrix(6, 42)
    const s = new PairingSolver(uniformRatings(m), modulesForTeamSize(6))
    const st = s.defenderStage(0, fullMask(6), fullMask(6))
    expect(st.game.value).toBeCloseTo(s.value(0, fullMask(6), fullMask(6)), 9)
    expect(st.game.row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })

  it('solves the largest case (8 players) in a reasonable time', () => {
    const t = Date.now()
    rootValue(randomMatrix(8, 7))
    expect(Date.now() - t).toBeLessThan(60_000)
  })
})

/**
 * Independent brute force for n=3 (Main Engagement): defenders d,e; attackers are the other
 * two; my defender picks which of their attackers to face, theirs picks which of mine; the
 * refused pair plays each other. Solved with an exhaustive mixed-strategy grid search for the
 * 2x2 and 3x3 matrix games rather than the production solver.
 */
function brute3(M: number[][], iPick: number[][] = M, theyPick: number[][] = M): number {
  const stage3 = (d: number, e: number) => {
    const mine = [0, 1, 2].filter((x) => x !== d)
    const theirs = [0, 1, 2].filter((x) => x !== e)
    const A = theirs.map((b) =>
      mine.map((a) => {
        const aRef = mine.find((x) => x !== a)!
        const bRef = theirs.find((x) => x !== b)!
        return iPick[d][b] + theyPick[a][e] + M[aRef][bRef]
      }),
    )
    return gridValue(A)
  }
  const A = [0, 1, 2].map((d) => [0, 1, 2].map((e) => stage3(d, e)))
  return gridValue(A)
}

function gridValue(A: number[][]): number {
  const m = A.length
  const n = A[0].length
  const steps = 200
  let best = -Infinity
  const rec = (i: number, left: number, p: number[]) => {
    if (i === m - 1) {
      const q = [...p, left]
      let worst = Infinity
      for (let j = 0; j < n; j++) {
        let s = 0
        for (let r = 0; r < m; r++) s += (q[r] / steps) * A[r][j]
        worst = Math.min(worst, s)
      }
      best = Math.max(best, worst)
      return
    }
    for (let x = 0; x <= left; x++) rec(i + 1, left - x, [...p, x])
  }
  rec(0, steps, [])
  return best
}
