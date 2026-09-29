import { configureStore } from '@reduxjs/toolkit'
import eventsReducer from './eventsSlice'
import { loadEvents, saveEvents } from '@/infrastructure/storage/eventsStorage'

export const store = configureStore({
  reducer: { events: eventsReducer },
  preloadedState: { events: { events: loadEvents() } },
})

// Persist on every change of the events array (immer keeps the reference stable otherwise).
let last = store.getState().events.events
store.subscribe(() => {
  const next = store.getState().events.events
  if (next !== last) {
    last = next
    saveEvents(next)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
