import type { Player } from '@/types'
import { FACTIONS } from '@/core/constants/factions'
import { DISPOSITIONS, dispositionById } from '@/core/constants/dispositions'
import { inputClass } from '@/shared/components/ui'

interface Props {
  index: number
  player: Player
  placeholder: string
  onChange: (patch: Partial<Player>) => void
  /** Rivals: the army says more than the name, so it goes first. */
  armyFirst?: boolean
}

export function PlayerRow({ index, player, placeholder, onChange, armyFirst }: Props) {
  const disp = dispositionById(player.dispositionId)
  const nameField = (
    <input
      key="name"
      className={inputClass}
      value={player.name}
      placeholder={placeholder}
      maxLength={60}
      aria-label={`Nombre del jugador ${index + 1}`}
      onChange={(e) => onChange({ name: e.target.value })}
    />
  )
  const armyField = (
    <select
      key="army"
      className={inputClass}
      value={player.factionId}
      aria-label={`Facción del jugador ${index + 1}`}
      onChange={(e) => onChange({ factionId: e.target.value })}
    >
      <option value="">Facción…</option>
      {FACTIONS.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1.75rem_1.4fr_1.2fr_1.2fr_1.4fr] gap-1.5 items-center border border-rim bg-surface-2 p-2">
      <span className={`font-display text-xs ${disp ? disp.text : 'text-parchment-dim'}`}>{index + 1}</span>
      {armyFirst ? [armyField, nameField] : [nameField, armyField]}
      <select
        className={inputClass}
        value={player.dispositionId}
        aria-label={`Disposición del jugador ${index + 1}`}
        onChange={(e) => onChange({ dispositionId: e.target.value })}
      >
        <option value="">Disposición…</option>
        {DISPOSITIONS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        className={inputClass}
        value={player.note}
        placeholder="Nota"
        maxLength={500}
        aria-label={`Nota del jugador ${index + 1}`}
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </div>
  )
}
