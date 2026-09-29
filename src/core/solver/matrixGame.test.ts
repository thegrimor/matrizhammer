import { describe, expect, it } from 'vitest'
import { argmax, solveGame, value2x2 } from './matrixGame'

function certify(A: number[][]) {
  const { value, row, col } = solveGame(A)
  const m = A.length
  const n = A[0].length
  // row strategy guarantees >= value against every column
  for (let j = 0; j < n; j++) {
    let s = 0
    for (let i = 0; i < m; i++) s += row[i] * A[i][j]
    expect(s).toBeGreaterThanOrEqual(value - 1e-6)
  }
  // col strategy holds row player to <= value against every row
  for (let i = 0; i < m; i++) {
    let s = 0
    for (let j = 0; j < n; j++) s += col[j] * A[i][j]
    expect(s).toBeLessThanOrEqual(value + 1e-6)
  }
  expect(row.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 6)
  expect(col.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 6)
  return value
}

describe('solveGame', () => {
  it('finds a pure saddle point', () => {
    const s = solveGame([[3, 5], [2, 4]])
    expect(s.value).toBe(3)
    expect(s.row).toEqual([1, 0])
    expect(s.col).toEqual([1, 0])
  })

  it('solves matching pennies with a mixed strategy', () => {
    const s = solveGame([[1, -1], [-1, 1]])
    expect(s.value).toBeCloseTo(0, 9)
    expect(s.row[0]).toBeCloseTo(0.5, 9)
    expect(s.col[0]).toBeCloseTo(0.5, 9)
  })

  it('solves rock-paper-scissors (3x3, needs the simplex)', () => {
    const s = solveGame([[0, -1, 1], [1, 0, -1], [-1, 1, 0]])
    expect(s.value).toBeCloseTo(0, 9)
    for (const x of [...s.row, ...s.col]) expect(x).toBeCloseTo(1 / 3, 9)
  })

  it('solves a known 3x3 game', () => {
    // value 20/13-ish check via certificate rather than a hard-coded fraction
    certify([[4, 1, 8], [2, 3, 1], [0, 4, 3]])
  })

  it('agrees with value2x2', () => {
    expect(value2x2(1, -1, -1, 1)).toBeCloseTo(0, 9)
    expect(value2x2(3, 5, 2, 4)).toBe(3)
  })

  it('certifies optimality on random games of many shapes', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    for (let t = 0; t < 200; t++) {
      const m = 1 + Math.floor(rnd() * 8)
      const n = 1 + Math.floor(rnd() * 8)
      const A = Array.from({ length: m }, () => Array.from({ length: n }, () => 1 + Math.floor(rnd() * 7)))
      certify(A)
    }
  })

  it('argmax breaks ties towards the lowest index', () => {
    expect(argmax([0.5, 0.5])).toBe(0)
    expect(argmax([0.2, 0.7, 0.1])).toBe(1)
  })
})
