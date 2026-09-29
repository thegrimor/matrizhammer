import type { Player } from '@/types'
import { factionName, factionShort } from '@/core/constants/factions'

// The rosters are pre-filled with "Jugador 3" / "Rival 3": those are placeholders, not real names.
const PLACEHOLDER = /^(jugador|rival)\s+\d+$/i

function realName(p: Player): string {
  const n = p.name.trim()
  return PLACEHOLDER.test(n) ? '' : n
}

/** My player: their name ("Jugador n" if blank). */
export function myLabel(p: Player, i: number): string {
  return p.name.trim() || `Jugador ${i + 1}`
}

/** My player with their army: "Nombre (Army)". */
export function myLabelWithArmy(p: Player, i: number): string {
  const army = factionName(p.factionId)
  return army ? `${myLabel(p, i)} (${army})` : myLabel(p, i)
}

/**
 * A rival, army first — the army says far more about a rival than their name: "Necrons (Bruno)",
 * or just "Necrons" when the name is a placeholder. Falls back to the name when no army is set.
 */
export function rivalLabel(p: Player, i: number): string {
  const army = factionName(p.factionId)
  const name = realName(p)
  if (army) return name ? `${army} (${name})` : army
  return name || `Rival ${i + 1}`
}

/** A rival in a tight space (matrix header): the short army name, else the name. */
export function rivalShort(p: Player, i: number): string {
  return factionShort(p.factionId) || realName(p) || `Rival ${i + 1}`
}
