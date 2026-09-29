import { argmax, solveGame, value2x2, type GameSolution } from './matrixGame'

/** Initial Skirmish / Main Engagement / Champion System — the three pairing modules. */
export type ModuleKind = 'IS' | 'ME' | 'CH'

export const MIN_TEAM_SIZE = 3
export const MAX_TEAM_SIZE = 8
export const DEFAULT_TEAM_SIZE = 6

/** Which modules a team of this size plays, in order (Teams Event Companion, "Pairing system"). */
export function modulesForTeamSize(size: number): ModuleKind[] {
  switch (size) {
    case 3:
      return ['ME']
    case 4:
      return ['ME', 'CH']
    case 5:
      return ['IS', 'ME']
    case 6:
      return ['IS', 'ME', 'CH']
    case 7:
      return ['IS', 'IS', 'ME']
    case 8:
      return ['IS', 'IS', 'ME', 'CH']
    default:
      throw new Error(`Tamaño de equipo no soportado: ${size}`)
  }
}

export function bits(mask: number): number[] {
  const out: number[] = []
  for (let i = 0; mask >> i; i++) if (mask & (1 << i)) out.push(i)
  return out
}

export function fullMask(n: number): number {
  return (1 << n) - 1
}

function pairsOf(list: number[]): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]])
  return out
}

export interface DefenderStage {
  mineOptions: number[]
  theirOptions: number[]
  game: GameSolution
}
export interface AttackerStage {
  mineOptions: [number, number][]
  theirOptions: [number, number][]
  game: GameSolution
}
/** Which opposing attacker each defender chooses to play. */
export interface RefusalStage {
  /** My defender's possible opponents (their two attackers). */
  mineOptions: number[]
  /** Their defender's possible opponents (my two attackers). */
  theirOptions: number[]
  game: GameSolution
}

/**
 * Exact solver for the whole multi-module pairing game (zero-sum, payoff = sum of the 1–7
 * ratings of every game played, from my side). `matrix[i][j]` = my rating of my player `i`
 * against their player `j`. Backward induction, memoised on (module, my pool, their pool).
 *
 * Module resolution: defenders chosen simultaneously → attacker pairs chosen simultaneously
 * (knowing the defenders) → each team picks which opposing attacker its defender plays,
 * simultaneously. In Initial Skirmish the refused attackers return to the pool; in Main
 * Engagement they play each other.
 */
export class PairingSolver {
  private memo = new Map<number, number>()

  readonly matrix: number[][]
  readonly modules: ModuleKind[]

  constructor(matrix: number[][], modules: ModuleKind[]) {
    this.matrix = matrix
    this.modules = modules
  }

  private key(k: number, P: number, Q: number): number {
    return (k << 16) | (P << 8) | Q
  }

  /** Expected total of every game played from module `k` onward. */
  value(k: number, P: number, Q: number): number {
    if (k >= this.modules.length) return 0
    if (this.modules[k] === 'CH') return this.matrix[bits(P)[0]][bits(Q)[0]]
    const key = this.key(k, P, Q)
    const hit = this.memo.get(key)
    if (hit !== undefined) return hit
    const v = this.defenderStage(k, P, Q).game.value
    this.memo.set(key, v)
    return v
  }

  defenderStage(k: number, P: number, Q: number): DefenderStage {
    const mineOptions = bits(P)
    const theirOptions = bits(Q)
    const A = mineOptions.map((d) =>
      theirOptions.map((e) => this.attackerStage(k, P, Q, d, e).game.value),
    )
    return { mineOptions, theirOptions, game: solveGame(A) }
  }

  attackerStage(k: number, P: number, Q: number, d: number, e: number): AttackerStage {
    const mineOptions = pairsOf(bits(P & ~(1 << d)))
    const theirOptions = pairsOf(bits(Q & ~(1 << e)))
    const A = mineOptions.map((mp) => theirOptions.map((tp) => this.refusalValue(k, P, Q, d, e, mp, tp)))
    return { mineOptions, theirOptions, game: solveGame(A) }
  }

  /** Payoff of one cell of the refusal game: I face `b` (of their pair), they face `a` (of mine). */
  private cell(
    k: number,
    P: number,
    Q: number,
    d: number,
    e: number,
    mp: [number, number],
    tp: [number, number],
    b: number,
    a: number,
  ): number {
    const M = this.matrix
    let v = M[d][b] + M[a][e]
    if (this.modules[k] === 'IS') {
      v += this.value(k + 1, P & ~((1 << d) | (1 << a)), Q & ~((1 << e) | (1 << b)))
    } else {
      const aRefused = mp[0] === a ? mp[1] : mp[0]
      const bRefused = tp[0] === b ? tp[1] : tp[0]
      v += M[aRefused][bRefused]
      v += this.value(k + 1, P & ~((1 << d) | (1 << mp[0]) | (1 << mp[1])), Q & ~((1 << e) | (1 << tp[0]) | (1 << tp[1])))
    }
    return v
  }

  private refusalValue(
    k: number,
    P: number,
    Q: number,
    d: number,
    e: number,
    mp: [number, number],
    tp: [number, number],
  ): number {
    return value2x2(
      this.cell(k, P, Q, d, e, mp, tp, tp[0], mp[0]),
      this.cell(k, P, Q, d, e, mp, tp, tp[0], mp[1]),
      this.cell(k, P, Q, d, e, mp, tp, tp[1], mp[0]),
      this.cell(k, P, Q, d, e, mp, tp, tp[1], mp[1]),
    )
  }

  refusalStage(
    k: number,
    P: number,
    Q: number,
    d: number,
    e: number,
    mp: [number, number],
    tp: [number, number],
  ): RefusalStage {
    const A = tp.map((b) => mp.map((a) => this.cell(k, P, Q, d, e, mp, tp, b, a)))
    return { mineOptions: [...tp], theirOptions: [...mp], game: solveGame(A) }
  }
}

/** Recommended (mine) and predicted (theirs) option: the mode of each side's equilibrium. */
export function recommend<T>(mineOptions: T[], theirOptions: T[], game: GameSolution): { mine: T; theirs: T } {
  return { mine: mineOptions[argmax(game.row)], theirs: theirOptions[argmax(game.col)] }
}
