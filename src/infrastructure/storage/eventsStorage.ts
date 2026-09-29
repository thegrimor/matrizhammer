import type { TeamEvent } from '@/types'
import { sanitizeEvent } from '@/core/utils/codec'

const KEY = 'matrizhammer-events'
const VERSION = 1

export function loadEvents(): TeamEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { version?: number; events?: unknown[] }
    if (data.version !== VERSION || !Array.isArray(data.events)) return []
    return data.events.map(sanitizeEvent).filter((e): e is TeamEvent => e !== null)
  } catch {
    return []
  }
}

export function saveEvents(events: TeamEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, events }))
  } catch {
    // Storage full or unavailable (private mode): the app keeps working in memory.
  }
}
