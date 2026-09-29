import type { Player, Round } from '@/types'
import type { Match } from '@/core/solver/roundFlow'
import { battlePoints, roundOutcome, teamPoints } from '@/core/utils/scoring'
import { inputClass, SectionHeader } from '@/shared/components/ui'

interface Props {
  round: Round
  mine: Player[]
  matches: Match[]
  complete: boolean
  teamSize: number
  onSet: (key: string, patch: { myVp?: number | null; theirVp?: number | null }) => void
}

const nm = (p: Player, i: number, prefix: string) => p.name.trim() || `${prefix} ${i + 1}`
const KIND = { defender: 'Defensor', attacker: 'Atacante', refused: 'Rechazados', champion: 'Campeón' } as const

export function ResultsPanel({ round, mine, matches, complete, teamSize, onSet }: Props) {
  if (!complete) {
    return <div className="border border-dashed border-rim-bright p-4 text-[12px] text-parchment-dim">Completa el pareo para anotar los resultados.</div>
  }
  const rows = matches.map((m) => {
    const key = `${m.mine}-${m.theirs}`
    const r = round.results[key]
    const bp = r && r.myVp !== null && r.theirVp !== null ? battlePoints(r.myVp - r.theirVp) : null
    return { m, key, r, bp }
  })
  const scoredRows = rows.filter((x) => x.bp !== null)
  const scored = scoredRows.length
  const myBp = scoredRows.reduce((sum, x) => sum + x.bp!.player, 0)
  const theirBp = scoredRows.reduce((sum, x) => sum + x.bp!.opponent, 0)
  const done = scored === matches.length
  const outcome = done ? roundOutcome(myBp, theirBp, teamSize) : null
  const parse = (v: string) => (v === '' ? null : Math.max(0, Math.min(999, Math.round(Number(v)))))

  return (
    <div>
      <SectionHeader>Resultado real (opcional)</SectionHeader>
      <div className="space-y-1.5">
        {rows.map(({ m, key, r, bp }) => (
          <div key={key} className="grid grid-cols-[1fr_4.5rem_4.5rem_3rem] items-center gap-2 border border-rim bg-surface-2 p-2 text-[12px]">
            <div className="min-w-0">
              <div className="truncate">
                {nm(mine[m.mine], m.mine, 'Jugador')} <span className="text-parchment-dim">vs</span> {nm(round.opponents[m.theirs], m.theirs, 'Rival')}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-parchment-dim">
                {KIND[m.kind]} · puntuación {round.matrix[m.mine][m.theirs]}
              </div>
            </div>
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="Mis VP"
              aria-label="Mis VP"
              value={r?.myVp ?? ''}
              onChange={(e) => onSet(key, { myVp: parse(e.target.value) })}
            />
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="Sus VP"
              aria-label="Sus VP"
              value={r?.theirVp ?? ''}
              onChange={(e) => onSet(key, { theirVp: parse(e.target.value) })}
            />
            <div className="text-center font-display text-gold-bright">{bp ? `${bp.player} BP` : '—'}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 border border-rim-bright bg-surface-2 p-3 text-[12px]">
        <div>
          BP del equipo: <span className="font-display text-gold-bright">{myBp}</span> – <span className="font-display">{theirBp}</span>{' '}
          <span className="text-parchment-dim">({scored}/{matches.length} partidas con VP)</span>
        </div>
        {outcome && (
          <div className="mt-1">
            Ronda:{' '}
            <span className={outcome === 'win' ? 'text-neon' : outcome === 'loss' ? 'text-crimson-bright' : 'text-gold-bright'}>
              {outcome === 'win' ? 'victoria' : outcome === 'loss' ? 'derrota' : 'empate'}
            </span>{' '}
            · {teamPoints(outcome)} TP
          </div>
        )}
      </div>
    </div>
  )
}
