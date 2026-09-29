import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GameResult, Player, Step, TeamEvent } from '@/types'
import { LAYER_FIELD, type RatingLayer } from '@/core/utils/ratings'
import { createEvent, createRound } from '@/core/utils/factory'

interface EventsState {
  events: TeamEvent[]
}

const initialState: EventsState = { events: [] }

interface RoundRef {
  eventId: string
  roundId: string
}

const findEvent = (s: EventsState, id: string) => s.events.find((e) => e.id === id)
const findRound = (s: EventsState, ref: RoundRef) => findEvent(s, ref.eventId)?.rounds.find((r) => r.id === ref.roundId)

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    hydrateEvents(state, action: PayloadAction<TeamEvent[]>) {
      state.events = action.payload
    },
    addEvent: {
      reducer(state, action: PayloadAction<TeamEvent>) {
        state.events.unshift(action.payload)
      },
      prepare(name: string, teamSize: number) {
        return { payload: createEvent(name, teamSize) }
      },
    },
    removeEvent(state, action: PayloadAction<string>) {
      state.events = state.events.filter((e) => e.id !== action.payload)
    },
    renameEvent(state, action: PayloadAction<{ eventId: string; name: string }>) {
      const e = findEvent(state, action.payload.eventId)
      if (e) e.name = action.payload.name
    },
    setMyPlayer(state, action: PayloadAction<{ eventId: string; index: number; patch: Partial<Player> }>) {
      const p = findEvent(state, action.payload.eventId)?.myTeam[action.payload.index]
      if (p) Object.assign(p, action.payload.patch)
    },
    addRound(state, action: PayloadAction<{ eventId: string; copyFromRoundId?: string }>) {
      const e = findEvent(state, action.payload.eventId)
      if (!e) return
      const src = action.payload.copyFromRoundId ? e.rounds.find((r) => r.id === action.payload.copyFromRoundId) : undefined
      e.rounds.push(createRound(e, src))
    },
    removeRound(state, action: PayloadAction<RoundRef>) {
      const e = findEvent(state, action.payload.eventId)
      if (e) e.rounds = e.rounds.filter((r) => r.id !== action.payload.roundId)
    },
    setOpponentName(state, action: PayloadAction<RoundRef & { name: string }>) {
      const r = findRound(state, action.payload)
      if (r) r.opponentName = action.payload.name
    },
    setOpponentPlayer(state, action: PayloadAction<RoundRef & { index: number; patch: Partial<Player> }>) {
      const p = findRound(state, action.payload)?.opponents[action.payload.index]
      if (p) Object.assign(p, action.payload.patch)
    },
    setRating(
      state,
      action: PayloadAction<RoundRef & { layer: RatingLayer; row: number; col: number; value: number | null }>,
    ) {
      const r = findRound(state, action.payload)
      if (!r) return
      const grid = r[LAYER_FIELD[action.payload.layer]]
      if (grid[action.payload.row]) grid[action.payload.row][action.payload.col] = action.payload.value
    },
    pushStep(state, action: PayloadAction<RoundRef & { step: Step }>) {
      findRound(state, action.payload)?.steps.push(action.payload.step)
    },
    popStep(state, action: PayloadAction<RoundRef>) {
      findRound(state, action.payload)?.steps.pop()
    },
    resetSteps(state, action: PayloadAction<RoundRef>) {
      const r = findRound(state, action.payload)
      if (r) r.steps = []
    },
    setResult(state, action: PayloadAction<RoundRef & { key: string; patch: Partial<GameResult> }>) {
      const r = findRound(state, action.payload)
      if (!r) return
      const prev: GameResult = r.results[action.payload.key] ?? { myVp: null, theirVp: null }
      r.results[action.payload.key] = { ...prev, ...action.payload.patch }
    },
  },
})

export const {
  hydrateEvents,
  addEvent,
  removeEvent,
  renameEvent,
  setMyPlayer,
  addRound,
  removeRound,
  setOpponentName,
  setOpponentPlayer,
  setRating,
  pushStep,
  popStep,
  resetSteps,
  setResult,
} = eventsSlice.actions

export default eventsSlice.reducer
