/** A player on either team. Only `name` is required for the matrix; the rest is optional data. */
export interface Player {
  name: string
  /** `id` from `core/constants/factions.ts`, or '' when unknown. */
  factionId: string
  /** `id` from `core/constants/dispositions.ts`, or '' when unknown. */
  dispositionId: string
  note: string
}

/** 1 (bad) … 7 (good) from my side, or null while unrated. */
export type Rating = number | null

/**
 * One decision the two captains resolved in a round, plus what the app recommended at that
 * moment (kept as a snapshot so the log stays true after the matrix is edited, and so a future
 * "learn the rival" feature has data). Indices are 0-based positions in the team rosters.
 */
export type Step =
  | {
      kind: 'defenders'
      mine: number
      theirs: number
      recMine: number
      recTheirs: number
    }
  | {
      kind: 'attackers'
      mine: [number, number]
      theirs: [number, number]
      recMine: [number, number]
      recTheirs: [number, number]
    }
  | {
      kind: 'refusals'
      /** Index of THEIR attacker my defender plays. */
      mine: number
      /** Index of MY attacker their defender plays. */
      theirs: number
      recMine: number
      recTheirs: number
    }

export interface GameResult {
  myVp: number | null
  theirVp: number | null
}

export interface Round {
  id: string
  number: number
  opponentName: string
  opponents: Player[]
  /** matrix[i][j]: my player i vs their player j. */
  matrix: Rating[][]
  steps: Step[]
  /** Real results, keyed `${mineIndex}-${theirIndex}`. Optional. */
  results: Record<string, GameResult>
}

export interface TeamEvent {
  id: string
  name: string
  teamSize: number
  myTeam: Player[]
  rounds: Round[]
  createdAt: number
}
