import { describe, expect, it } from 'vitest'
import { createEvent, createRound } from './factory'
import { ratingSets } from './ratings'

describe('ratingSets', () => {
  it('is null until the main matrix is complete', () => {
    const ev = createEvent('x', 3)
    const r = createRound(ev)
    expect(ratingSets(r)).toBeNull()
    r.matrix.forEach((row) => row.fill(4))
    r.matrix[2][2] = null
    expect(ratingSets(r)).toBeNull()
  })

  it('empty override cells fall back to the main value', () => {
    const ev = createEvent('x', 3)
    const r = createRound(ev)
    r.matrix.forEach((row, i) => row.forEach((_, j) => (row[j] = 1 + ((i + j) % 7))))
    r.mapMine[0][1] = 7
    r.mapTheirs[2][0] = 1
    const s = ratingSets(r)!
    expect(s.neutral).toEqual(r.matrix)
    expect(s.mine[0][1]).toBe(7)
    expect(s.mine[1][1]).toBe(r.matrix[1][1])
    expect(s.theirs[2][0]).toBe(1)
    expect(s.theirs[0][0]).toBe(r.matrix[0][0])
  })
})
