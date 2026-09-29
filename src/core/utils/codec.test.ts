import { describe, expect, it } from 'vitest'
import { createEvent, createRound } from './factory'
import { decodeEvent, encodeEvent, sanitizeEvent } from './codec'

describe('event codec', () => {
  it('round-trips an event through the compressed code and through raw JSON', () => {
    const ev = createEvent('Torneo', 6)
    const r = createRound(ev)
    r.matrix[0][0] = 7
    r.matrix[5][5] = 1
    r.steps.push({ kind: 'defenders', mine: 0, theirs: 1, recMine: 0, recTheirs: 2 })
    r.results['0-1'] = { myVp: 80, theirVp: 50 }
    ev.rounds.push(r)
    expect(decodeEvent(encodeEvent(ev))).toEqual(ev)
    expect(decodeEvent(JSON.stringify(ev))).toEqual(ev)
  })

  it('rejects garbage and out-of-range data', () => {
    expect(decodeEvent('MH1:nonsense')).toBeNull()
    expect(decodeEvent('{"teamSize":12}')).toBeNull()
    expect(sanitizeEvent(null)).toBeNull()
  })

  it('drops invalid ratings and truncates a broken step log', () => {
    const ev = createEvent('x', 3)
    const r = createRound(ev)
    ev.rounds.push(r)
    const dirty = JSON.parse(JSON.stringify(ev))
    dirty.rounds[0].matrix[0][0] = 9
    dirty.rounds[0].matrix[0][1] = 3.5
    dirty.rounds[0].matrix[0][2] = 5
    dirty.rounds[0].steps = [{ kind: 'defenders', mine: 0, theirs: 0, recMine: 0, recTheirs: 0 }, { kind: 'nope' }]
    const clean = sanitizeEvent(dirty)!
    expect(clean.rounds[0].matrix[0]).toEqual([null, null, 5])
    expect(clean.rounds[0].steps).toHaveLength(1)
  })
})
