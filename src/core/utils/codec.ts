import type { GameResult, Player, Rating, Round, Step, TeamEvent } from '@/types'
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '@/core/solver/pairingGame'
import { newId } from './factory'

function str(x: unknown, max = 200): string {
  return typeof x === 'string' ? x.slice(0, max) : ''
}

function sanitizePlayer(x: unknown): Player {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  return { name: str(o.name, 60), factionId: str(o.factionId, 60), dispositionId: str(o.dispositionId, 60), note: str(o.note, 500) }
}

function sanitizeRating(x: unknown): Rating {
  return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 7 ? x : null
}

function idx(x: unknown, n: number): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < n ? x : null
}

function pair(x: unknown, n: number): [number, number] | null {
  if (!Array.isArray(x) || x.length !== 2) return null
  const a = idx(x[0], n)
  const b = idx(x[1], n)
  return a === null || b === null || a === b ? null : [a, b]
}

function sanitizeStep(x: unknown, n: number): Step | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  if (o.kind === 'defenders' || o.kind === 'refusals') {
    const v = [o.mine, o.theirs, o.recMine, o.recTheirs].map((y) => idx(y, n))
    if (v.some((y) => y === null)) return null
    return { kind: o.kind, mine: v[0]!, theirs: v[1]!, recMine: v[2]!, recTheirs: v[3]! }
  }
  if (o.kind === 'attackers') {
    const v = [o.mine, o.theirs, o.recMine, o.recTheirs].map((y) => pair(y, n))
    if (v.some((y) => y === null)) return null
    return { kind: 'attackers', mine: v[0]!, theirs: v[1]!, recMine: v[2]!, recTheirs: v[3]! }
  }
  return null
}

function sanitizeRound(x: unknown, n: number): Round | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const opponents = Array.from({ length: n }, (_, i) =>
    sanitizePlayer(Array.isArray(o.opponents) ? o.opponents[i] : undefined),
  )
  const grid = (src: unknown) =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const row = Array.isArray(src) ? src[i] : undefined
        return sanitizeRating(Array.isArray(row) ? row[j] : undefined)
      }),
    )
  // Events saved before per-map ratings existed have no mapMine/mapTheirs: they read as empty.
  const matrix = grid(o.matrix)
  const mapMine = grid(o.mapMine)
  const mapTheirs = grid(o.mapTheirs)
  const steps: Step[] = []
  if (Array.isArray(o.steps)) {
    for (const s of o.steps) {
      const clean = sanitizeStep(s, n)
      if (!clean) break // a broken log cannot be replayed past its first bad step
      steps.push(clean)
    }
  }
  const results: Record<string, GameResult> = {}
  if (o.results && typeof o.results === 'object') {
    for (const [k, v] of Object.entries(o.results as Record<string, unknown>)) {
      if (!/^\d+-\d+$/.test(k) || !v || typeof v !== 'object') continue
      const r = v as Record<string, unknown>
      const vp = (y: unknown) => (typeof y === 'number' && Number.isFinite(y) && y >= 0 && y <= 999 ? Math.round(y) : null)
      results[k] = { myVp: vp(r.myVp), theirVp: vp(r.theirVp) }
    }
  }
  return {
    id: str(o.id, 80) || newId(),
    number: typeof o.number === 'number' && Number.isInteger(o.number) && o.number > 0 ? o.number : 1,
    opponentName: str(o.opponentName, 80),
    opponents,
    matrix,
    mapMine,
    mapTheirs,
    steps,
    results,
  }
}

/** Validates untrusted data (whatever localStorage holds) into a well-formed event, or null. */
export function sanitizeEvent(x: unknown): TeamEvent | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const n = o.teamSize
  if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_TEAM_SIZE || n > MAX_TEAM_SIZE) return null
  const myTeam = Array.from({ length: n }, (_, i) => sanitizePlayer(Array.isArray(o.myTeam) ? o.myTeam[i] : undefined))
  const rounds = (Array.isArray(o.rounds) ? o.rounds : [])
    .map((r) => sanitizeRound(r, n))
    .filter((r): r is Round => r !== null)
  return {
    id: str(o.id, 80) || newId(),
    name: str(o.name, 80) || 'Evento sin nombre',
    teamSize: n,
    myTeam,
    rounds,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
  }
}
