/**
 * Zero-sum matrix game solver. `A[i][j]` is the payoff to the row player (who maximises)
 * when the row player picks `i` and the column player (who minimises) picks `j`.
 */
export interface GameSolution {
  value: number
  /** Row player's optimal mixed strategy (sums to 1). */
  row: number[]
  /** Column player's optimal mixed strategy (sums to 1). */
  col: number[]
}

const EPS = 1e-9

/** Value only of a 2x2 game, allocation-free — the hot path of the pairing solver. */
export function value2x2(a: number, b: number, c: number, d: number): number {
  const maximin = Math.max(Math.min(a, b), Math.min(c, d))
  const minimax = Math.min(Math.max(a, c), Math.max(b, d))
  if (maximin >= minimax - EPS) return maximin
  return (a * d - b * c) / (a - b - c + d)
}

function pureSaddle(A: number[][]): GameSolution | null {
  const m = A.length
  const n = A[0].length
  let bestRow = 0
  let maximin = -Infinity
  for (let i = 0; i < m; i++) {
    let rowMin = Infinity
    for (let j = 0; j < n; j++) rowMin = Math.min(rowMin, A[i][j])
    if (rowMin > maximin + EPS) {
      maximin = rowMin
      bestRow = i
    }
  }
  let bestCol = 0
  let minimax = Infinity
  for (let j = 0; j < n; j++) {
    let colMax = -Infinity
    for (let i = 0; i < m; i++) colMax = Math.max(colMax, A[i][j])
    if (colMax < minimax - EPS) {
      minimax = colMax
      bestCol = j
    }
  }
  if (Math.abs(maximin - minimax) > EPS) return null
  const row = new Array(m).fill(0)
  const col = new Array(n).fill(0)
  row[bestRow] = 1
  col[bestCol] = 1
  return { value: maximin, row, col }
}

function solve2x2(A: number[][]): GameSolution {
  const [[a, b], [c, d]] = A
  const denom = a - b - c + d
  const p = (d - c) / denom
  const q = (d - b) / denom
  return { value: (a * d - b * c) / denom, row: [p, 1 - p], col: [q, 1 - q] }
}

/**
 * Bland's-rule simplex on: maximise sum(z) s.t. A'z <= 1, z >= 0, with A' = A + shift > 0.
 * Then v' = 1/sum(z), col strategy = z*v', row strategy = duals*v'.
 */
function solveSimplex(A: number[][]): GameSolution {
  const m = A.length
  const n = A[0].length
  let min = Infinity
  for (const r of A) for (const x of r) min = Math.min(min, x)
  const shift = 1 - min

  const width = n + m + 1
  const T: number[][] = []
  for (let i = 0; i < m; i++) {
    const row = new Array(width).fill(0)
    for (let j = 0; j < n; j++) row[j] = A[i][j] + shift
    row[n + i] = 1
    row[width - 1] = 1
    T.push(row)
  }
  const obj = new Array(width).fill(0)
  for (let j = 0; j < n; j++) obj[j] = -1
  T.push(obj)
  const basis = Array.from({ length: m }, (_, i) => n + i)

  for (let iter = 0; iter < 10000; iter++) {
    let enter = -1
    for (let j = 0; j < n + m; j++) {
      if (T[m][j] < -EPS) {
        enter = j
        break
      }
    }
    if (enter < 0) break
    let leave = -1
    let bestRatio = Infinity
    for (let i = 0; i < m; i++) {
      if (T[i][enter] > EPS) {
        const ratio = T[i][width - 1] / T[i][enter]
        if (ratio < bestRatio - EPS || (Math.abs(ratio - bestRatio) <= EPS && basis[i] < basis[leave])) {
          bestRatio = ratio
          leave = i
        }
      }
    }
    if (leave < 0) break // unbounded cannot happen for A' > 0
    const pivot = T[leave][enter]
    for (let j = 0; j < width; j++) T[leave][j] /= pivot
    for (let i = 0; i <= m; i++) {
      if (i === leave) continue
      const f = T[i][enter]
      if (Math.abs(f) < 1e-15) continue
      for (let j = 0; j < width; j++) T[i][j] -= f * T[leave][j]
    }
    basis[leave] = enter
  }

  const sumZ = T[m][width - 1]
  const vShifted = 1 / sumZ
  const col = new Array(n).fill(0)
  for (let i = 0; i < m; i++) if (basis[i] < n) col[basis[i]] = T[i][width - 1] * vShifted
  const row = new Array(m).fill(0)
  for (let i = 0; i < m; i++) row[i] = T[m][n + i] * vShifted
  return { value: vShifted - shift, row: normalise(row), col: normalise(col) }
}

function normalise(v: number[]): number[] {
  const clean = v.map((x) => (x < 1e-9 ? 0 : x))
  const sum = clean.reduce((s, x) => s + x, 0)
  return sum > 0 ? clean.map((x) => x / sum) : clean
}

export function solveGame(A: number[][]): GameSolution {
  const m = A.length
  const n = A[0].length
  const saddle = pureSaddle(A)
  if (saddle) return saddle
  if (m === 2 && n === 2) return solve2x2(A)
  return solveSimplex(A)
}

/** Index of the largest probability; ties go to the lowest index (deterministic). */
export function argmax(p: number[]): number {
  let best = 0
  for (let i = 1; i < p.length; i++) if (p[i] > p[best] + 1e-9) best = i
  return best
}
