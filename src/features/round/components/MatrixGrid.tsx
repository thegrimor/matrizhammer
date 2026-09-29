import { useRef, useState } from 'react'
import type { Player, Rating } from '@/types'
import { MAX_RATING, MIN_RATING, RATING_CLASSES } from '@/core/constants/ratings'
import { dispositionById } from '@/core/constants/dispositions'
import { Button } from '@/shared/components/ui'

interface Props {
  mine: Player[]
  theirs: Player[]
  matrix: Rating[][]
  /** `${row}-${col}` of games already decided in the round, to highlight them. */
  highlight?: Set<string>
  onSet: (row: number, col: number, value: number | null) => void
}

const label = (p: Player, i: number, prefix: string) => p.name.trim() || `${prefix} ${i + 1}`

function Header({ p, i, prefix }: { p: Player; i: number; prefix: string }) {
  const disp = dispositionById(p.dispositionId)
  return (
    <span className="flex items-center gap-1 min-w-0">
      {disp && <span className={`w-1 h-3 shrink-0 ${disp.bar}`} aria-hidden />}
      <span className="truncate">{label(p, i, prefix)}</span>
    </span>
  )
}

/** N×N rating grid with a fast keypad: click a cell (or use arrows) and type 1–7. */
export function MatrixGrid({ mine, theirs, matrix, highlight, onSet }: Props) {
  const n = mine.length
  const [rawSel, setSel] = useState<[number, number]>([0, 0])
  const ref = useRef<HTMLDivElement>(null)
  // The grid can be reused for a team of another size when navigating between events.
  const sel: [number, number] = [Math.min(rawSel[0], n - 1), Math.min(rawSel[1], n - 1)]

  const advance = ([r, c]: [number, number]): [number, number] =>
    c + 1 < n ? [r, c + 1] : r + 1 < n ? [r + 1, 0] : [r, c]

  const setValue = (v: number | null) => {
    onSet(sel[0], sel[1], v)
    if (v !== null) setSel(advance(sel))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const [r, c] = sel
    if (/^[1-7]$/.test(e.key)) {
      e.preventDefault()
      setValue(Number(e.key))
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault()
      setValue(null)
    } else if (e.key === 'ArrowRight') setSel([r, Math.min(n - 1, c + 1)])
    else if (e.key === 'ArrowLeft') setSel([r, Math.max(0, c - 1)])
    else if (e.key === 'ArrowDown') setSel([Math.min(n - 1, r + 1), c])
    else if (e.key === 'ArrowUp') setSel([Math.max(0, r - 1), c])
    else return
    e.preventDefault()
  }

  const filled = matrix.reduce((s, row) => s + row.filter((x) => x !== null).length, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-widest text-parchment-dim">
        <span>
          Puntuadas <span className={filled === n * n ? 'text-neon' : 'text-gold-bright'}>{filled}/{n * n}</span>
        </span>
        <span>1 malo · 7 bueno</span>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="overflow-x-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        aria-label="Matriz de puntuaciones"
      >
        <table className="border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="text-left text-[9px] uppercase tracking-widest text-parchment-dim font-normal pr-1">Yo ↓ / Rival →</th>
              {theirs.map((p, j) => (
                <th key={j} className="font-normal text-parchment-dim max-w-[4.5rem] min-w-[2.75rem] text-left align-bottom pb-0.5">
                  <Header p={p} i={j} prefix="Rival" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mine.map((p, i) => (
              <tr key={i}>
                <th className="font-normal text-left text-parchment max-w-[6.5rem] pr-1">
                  <Header p={p} i={i} prefix="Jugador" />
                </th>
                {theirs.map((_, j) => {
                  const v = matrix[i][j]
                  const selected = sel[0] === i && sel[1] === j
                  const hit = highlight?.has(`${i}-${j}`)
                  return (
                    <td key={j}>
                      <button
                        type="button"
                        onClick={() => {
                          setSel([i, j])
                          ref.current?.focus()
                        }}
                        aria-label={`${label(p, i, 'Jugador')} contra ${label(theirs[j], j, 'Rival')}: ${v ?? 'sin puntuar'}`}
                        className={`w-full h-9 min-w-[2.75rem] border font-display text-sm transition-colors ${
                          v === null ? 'border-dashed border-rim-bright text-parchment-dim/50 bg-surface-3' : RATING_CLASSES[v]
                        } ${selected ? 'ring-2 ring-gold-bright' : ''} ${hit ? 'outline outline-2 outline-crimson-bright -outline-offset-2' : ''}`}
                      >
                        {v ?? '·'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Teclado rápido">
        {Array.from({ length: MAX_RATING - MIN_RATING + 1 }, (_, k) => MIN_RATING + k).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValue(v)}
            className={`w-11 h-11 border font-display text-base ${RATING_CLASSES[v]} hover:brightness-125`}
          >
            {v}
          </button>
        ))}
        <Button onClick={() => setValue(null)} className="h-11">
          Borrar
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-parchment-dim">
        Toca una celda y pulsa 1–7 (teclado o botones): salta a la siguiente. Flechas para moverte, Supr para borrar.
      </p>
    </div>
  )
}
