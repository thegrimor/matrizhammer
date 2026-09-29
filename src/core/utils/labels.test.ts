import { describe, expect, it } from 'vitest'
import { emptyPlayer } from './factory'
import { myLabel, myLabelWithArmy, rivalLabel, rivalShort } from './labels'

const rival = (name: string, factionId = '') => ({ ...emptyPlayer(name), factionId })

describe('labels', () => {
  it('rivals lead with the army', () => {
    expect(rivalLabel(rival('Bruno', 'necrons'), 0)).toBe('Necrons (Bruno)')
    expect(rivalShort(rival('Bruno', 'necrons'), 0)).toBe('Necrons')
    expect(rivalShort(rival('Bruno', 'chaos-space-marines'), 0)).toBe('CSM')
  })

  it('placeholder names ("Rival 3") are not shown next to the army', () => {
    expect(rivalLabel(rival('Rival 3', 'orks'), 2)).toBe('Orks')
    expect(rivalLabel(rival('rival 3', 'orks'), 2)).toBe('Orks')
  })

  it('falls back to the name, then to the position, when there is no army', () => {
    expect(rivalLabel(rival('Bruno'), 0)).toBe('Bruno')
    expect(rivalLabel(rival(''), 4)).toBe('Rival 5')
    expect(rivalShort(rival('Rival 2'), 1)).toBe('Rival 2')
  })

  it('my players keep name first', () => {
    expect(myLabel(emptyPlayer('Ana'), 0)).toBe('Ana')
    expect(myLabel(emptyPlayer(''), 2)).toBe('Jugador 3')
    expect(myLabelWithArmy({ ...emptyPlayer('Ana'), factionId: 'necrons' }, 0)).toBe('Ana (Necrons)')
    expect(myLabelWithArmy(emptyPlayer('Ana'), 0)).toBe('Ana')
  })
})
