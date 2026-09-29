import type { Player } from '@/types'
import { dispositionById } from '@/core/constants/dispositions'
import { rivalLabel } from '@/core/utils/labels'

interface Props {
  player: Player
  index: number
  /** Height of the header cell (Tailwind class): tall enough for "Chaos Space Marines". */
  heightClass?: string
  /** Small mark next to the number (assistant: D / A / ✓ / –). */
  badge?: string
  /** Extra classes on the text (dimming, highlight ring…). */
  textClass?: string
}

/**
 * Column header for a rival, written vertically so the whole army name fits above a narrow column
 * (the army says far more about a rival than a name; horizontal text got cut to "Riv…").
 */
export function VerticalHeader({ player, index, heightClass = 'h-24', badge, textClass = '' }: Props) {
  const disp = dispositionById(player.dispositionId)
  return (
    <div className={`flex flex-col items-center justify-end gap-0.5 ${heightClass}`} title={rivalLabel(player, index)}>
      {badge && <span className="text-[9px] leading-none text-parchment-dim">{badge}</span>}
      <span
        className={`[writing-mode:vertical-rl] rotate-180 min-h-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-tight ${textClass}`}
      >
        {rivalLabel(player, index)}
      </span>
      <span className="text-[9px] leading-none text-parchment-dim/70">{index + 1}</span>
      {disp && <span className={`h-0.5 w-3 shrink-0 ${disp.bar}`} aria-hidden />}
    </div>
  )
}
