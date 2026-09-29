import type { Player, Round, TeamEvent } from '@/types'

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function emptyPlayer(name = ''): Player {
  return { name, factionId: '', dispositionId: '', note: '' }
}

export function emptyMatrix(n: number): (number | null)[][] {
  return Array.from({ length: n }, () => new Array<number | null>(n).fill(null))
}

export function createEvent(name: string, teamSize: number): TeamEvent {
  return {
    id: newId(),
    name: name.trim() || 'Evento sin nombre',
    teamSize,
    myTeam: Array.from({ length: teamSize }, (_, i) => emptyPlayer(`Jugador ${i + 1}`)),
    rounds: [],
    createdAt: Date.now(),
  }
}

export function createRound(event: TeamEvent, copyFrom?: Round): Round {
  const n = event.teamSize
  return {
    id: newId(),
    number: event.rounds.reduce((max, r) => Math.max(max, r.number), 0) + 1,
    opponentName: '',
    opponents: Array.from({ length: n }, (_, i) => emptyPlayer(`Rival ${i + 1}`)),
    matrix: copyFrom ? copyFrom.matrix.map((row) => [...row]) : emptyMatrix(n),
    mapMine: copyFrom ? copyFrom.mapMine.map((row) => [...row]) : emptyMatrix(n),
    mapTheirs: copyFrom ? copyFrom.mapTheirs.map((row) => [...row]) : emptyMatrix(n),
    steps: [],
    results: {},
  }
}
