import type { Player, Rating, Round } from '@/types'
import type { Match, Progress, StepAnalysis } from '@/core/solver/roundFlow'
import { RATING_CLASSES } from '@/core/constants/ratings'
import { dispositionById } from '@/core/constants/dispositions'
import { myLabel, rivalLabel, rivalShort } from '@/core/utils/labels'

interface Props {
  round: Round
  mine: Player[]
  progress: Progress
  current: StepAnalysis | null
}

type Status = 'played' | 'defender' | 'attacker' | 'available' | 'out'

/** Who can still be picked right now (the assistant greys out everyone else). */
function statuses(n: number, pool: number, defender: number | undefined, attackers: [number, number] | undefined, phase: Progress['phase']): Status[] {
  return Array.from({ length: n }, (_, i): Status => {
    if (!((pool >> i) & 1)) return 'played'
    if (defender === i) return 'defender'
    if (phase === 'refusals') return attackers?.includes(i) ? 'attacker' : 'out'
    return 'available'
  })
}

const asList = (v: number | [number, number]) => (Array.isArray(v) ? v : [v])

const BADGE: Record<Status, string> = {
  played: '✓',
  defender: 'D',
  attacker: 'A',
  available: '',
  out: '–',
}

function Header({ p, i, rival, status, ring }: { p: Player; i: number; rival?: boolean; status: Status; ring: string }) {
  const disp = dispositionById(p.dispositionId)
  const dim = status === 'played' || status === 'out'
  return (
    <span className={`flex items-center gap-1 min-w-0 px-0.5 ${dim ? 'opacity-40 line-through' : ''} ${ring}`}>
      {disp && <span className={`w-1 h-3 shrink-0 ${disp.bar}`} aria-hidden />}
      <span className="shrink-0 text-parchment-dim/70">{i + 1}</span>
      <span className="truncate">{rival ? rivalShort(p, i) : myLabel(p, i)}</span>
      {BADGE[status] && (
        <span className={`shrink-0 text-[9px] no-underline ${status === 'defender' ? 'text-crimson-bright' : status === 'attacker' ? 'text-gold-bright' : 'text-parchment-dim'}`}>
          {BADGE[status]}
        </span>
      )}
    </span>
  )
}

/**
 * Read-only copy of the round's matrix for the assistant: players who can no longer be picked
 * (already matched, or not among the current attackers) are greyed out, the games already decided
 * are outlined, and the recommended / predicted choice of the current step is highlighted — so a
 * human can follow (and second-guess) the calculation.
 */
export function AssistantMatrix({ round, mine, progress, current }: Props) {
  const theirs = round.opponents
  const n = mine.length
  const myStatus = statuses(n, progress.poolMine, progress.defenderMine, progress.attackersMine, progress.phase)
  const theirStatus = statuses(n, progress.poolTheirs, progress.defenderTheirs, progress.attackersTheirs, progress.phase)

  const decided = new Map<string, Match>()
  progress.matches.forEach((m) => decided.set(`${m.mine}-${m.theirs}`, m))

  // Recommended (green) / predicted (amber) marks. In the refusal step they are games, not players.
  const recRows = new Set<number>()
  const recCells = new Set<string>()
  const predCells = new Set<string>()
  const predCols = new Set<number>()
  if (current) {
    if (current.phase === 'refusals') {
      // mine = their attacker my defender plays; theirs = my attacker their defender plays
      recCells.add(`${progress.defenderMine}-${current.recMine as number}`)
      predCells.add(`${current.recTheirs as number}-${progress.defenderTheirs}`)
    } else {
      asList(current.recMine).forEach((i) => recRows.add(i))
      asList(current.recTheirs).forEach((j) => predCols.add(j))
    }
  }

  const playable = (s: Status) => s !== 'played' && s !== 'out'

  return (
    <div>
      <div>
        <table className="w-full table-fixed border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr>
              <th className="w-[4.5rem] sm:w-24" />
              {theirs.map((p, j) => (
                <th key={j} title={rivalLabel(p, j)} className="overflow-hidden font-normal text-parchment-dim text-left align-bottom pb-0.5">
                  <Header p={p} i={j} rival status={theirStatus[j]} ring={predCols.has(j) ? 'outline outline-1 outline-gold-bright text-gold-bright' : ''} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mine.map((p, i) => (
              <tr key={i}>
                <th title={myLabel(p, i)} className="overflow-hidden font-normal text-left text-parchment pr-1">
                  <Header p={p} i={i} status={myStatus[i]} ring={recRows.has(i) ? 'outline outline-1 outline-neon text-neon' : ''} />
                </th>
                {theirs.map((_, j) => {
                  const v: Rating = round.matrix[i][j]
                  const y = round.mapMine[i][j]
                  const r = round.mapTheirs[i][j]
                  const live = playable(myStatus[i]) && playable(theirStatus[j])
                  const game = decided.get(`${i}-${j}`)
                  const key = `${i}-${j}`
                  return (
                    <td key={j}>
                      <div
                        className={`relative h-8 border text-center leading-8 font-display text-xs ${
                          v === null ? 'border-dashed border-rim-bright bg-surface-3' : RATING_CLASSES[v]
                        } ${live || game ? '' : 'opacity-25 saturate-0'} ${
                          game ? 'outline outline-2 outline-crimson-bright -outline-offset-2' : ''
                        } ${recCells.has(key) ? 'ring-2 ring-neon' : ''} ${predCells.has(key) ? 'ring-2 ring-gold-bright' : ''}`}
                        title={`${myLabel(mine[i], i)} vs ${rivalLabel(theirs[j], j)}${y !== null ? ` · Y${y}` : ''}${r !== null ? ` · R${r}` : ''}`}
                      >
                        {v ?? '·'}
                        {(y !== null || r !== null) && (
                          <span className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 text-[7px] leading-[8px] opacity-80">
                            <span>{y !== null ? `Y${y}` : ''}</span>
                            <span>{r !== null ? `R${r}` : ''}</span>
                          </span>
                        )}
                        {game && <span className="absolute top-0 right-0.5 text-[7px] leading-[8px] text-crimson-bright">●</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[9px] text-parchment-dim">
        Atenuado = ya no se puede elegir (✓ ya emparejado, – fuera de este paso). D defensor · A atacante · ● partida decidida ·{' '}
        <span className="text-neon">verde = recomendado</span> · <span className="text-gold-bright">ámbar = previsto del rival</span>.
      </p>
    </div>
  )
}
