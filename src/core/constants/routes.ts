export const ROUTES = {
  HOME: '/',
  EVENT: '/event/:eventId',
  ROUND: '/event/:eventId/round/:roundId',
} as const

export function eventPath(eventId: string) {
  return `/event/${eventId}`
}

export function roundPath(eventId: string, roundId: string) {
  return `/event/${eventId}/round/${roundId}`
}
