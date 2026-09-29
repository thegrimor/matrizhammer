import { useRef, useState } from 'react'
import type { Player, Rating } from '@/types'
import { MAX_RATING, MIN_RATING, RATING_CLASSES } from '@/core/constants/ratings'
import { dispositionById } from '@/core/constants/dispositions'
import { LAYER_LABELS, type RatingLayer } from '@/core/utils/ratings'
import { Button } from '@/shared/components/ui'

interface Props {
  mine: Player[]
  theirs: Player[]
  /** Main matrix: nobody picks the map. */
  matrix: Rating[][]
  /** Optional override when I pick the map. */
  mapMine: Rating[][]
  /** Optional override when they pick the map. */
  mapTheirs: Rating[][]
  /** `${row}-${col}` of games already decided in the round, to highlight them. */
  highlight?: Set<string>
  onSet: (layer: RatingLayer, row: number, col: number, value: number | null) => void
}

const label = (p: Player, i: number, prefix: string) => p.name.trim() || `${prefix} ${i + 1}`

function Header({ p, i, prefix }: { p: Player; i: number; prefix: string }) {
  const disp = dispositionById(p.dispositionId)
  return (
    <span className="flex items-center gap-1 min-w-0">
      {disp && <span className={`w-1 h-3 shrink-0 ${disp.bar}`} aria-hidden />}
      <span className="shrink-0 text-parchment-dim/70">{i + 1}</span>
      <span className="truncate">{label(p, i, prefix)}</span>
    </span>
  )
}

const LAYERS: RatingLayer[] = ['neutral', 'mine', 'theirs']
const LAYER_KEYS: Record<string, RatingLayer> = { n: 'neutral', y: 'mine', r: 'theirs' }

/**
 * N×N rating grid with a fast keypad: click a cell (or use arrows) and type 1–7. Each cell holds
 * up to three values in the same square: the main one (nobody picks the map, mandatory) and two
 * optional extras — I pick the map (Y) / they pick the map (R). The layer toggle chooses which
 * one the keypad edits.
 */
export function MatrixGrid({ mine, theirs, matrix, mapMine, mapTheirs, highlight, onSet }: Props) {
  const n = mine.length
  const [rawSel, setSel] = useState<[number, number]>([0, 0])
  const [layer, setLayer] = useState<RatingLayer>('neutral')
  const ref = useRef<HTMLDivElement>(null)
  // The grid can be reused for a team of another size when navigating between events.
  const sel: [number, number] = [Math.min(rawSel[0], n - 1), Math.min(rawSel[1], n - 1)]

  const advance = ([r, c]: [number, number]): [number, number] =>
    c + 1 < n ? [r, c + 1] : r + 1 < n ? [r + 1, 0] : [r, c]

  const setValue = (v: number | null) => {
    onSet(layer, sel[0], sel[1], v)
    if (v !== null) setSel(advance(sel))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const [r, c] = sel
    if (/^[1-7]$/.test(e.key)) setValue(Number(e.key))
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') setValue(null)
    else if (LAYER_KEYS[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey && !e.altKey) setLayer(LAYER_KEYS[e.key.toLowerCase()])
    else if (e.key === 'ArrowRight') setSel([r, Math.min(n - 1, c + 1)])
    else if (e.key === 'ArrowLeft') setSel([r, Math.max(0, c - 1)])
    else if (e.key === 'ArrowDown') setSel([Math.min(n - 1, r + 1), c])
    else if (e.key === 'ArrowUp') setSel([Math.max(0, r - 1), c])
    else return
    e.preventDefault()
  }

  const filled = matrix.reduce((s, row) => s + row.filter((x) => x !== null).length, 0)
  const extras = [mapMine, mapTheirs].reduce((s, g) => s + g.reduce((t, row) => t + row.filter((x) => x !== null).length, 0), 0)
  const focusGrid = () => ref.current?.focus()

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-widest text-parchment-dim">
        <span>
          Puntuadas <span className={filled === n * n ? 'text-neon' : 'text-gold-bright'}>{filled}/{n * n}</span>
          {extras > 0 && <span> · {extras} por mapa</span>}
        </span>
        <span>1 malo · 7 bueno</span>
      </div>

      <div className="mb-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Valor que estás editando">
        {LAYERS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={layer === l}
            onClick={() => {
              setLayer(l)
              focusGrid()
            }}
            className={`font-display text-[10px] uppercase tracking-widest px-2.5 py-1.5 border ${
              layer === l ? 'border-crimson bg-crimson/20 text-crimson-bright' : 'border-rim-bright text-parchment-dim hover:text-parchment'
            }`}
          >
            {LAYER_LABELS[l]}
            {l === 'neutral' && <span className="normal-case tracking-normal"> · principal</span>}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        aria-label="Matriz de puntuaciones"
      >
        <table className="w-full table-fixed border-separate border-spacing-0.5 sm:border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-[4.5rem] sm:w-28 text-left text-[8px] sm:text-[9px] uppercase tracking-wider text-parchment-dim font-normal pr-1 align-bottom">Yo ↓ / Rival →</th>
              {theirs.map((p, j) => (
                <th key={j} title={label(p, j, 'Rival')} className="overflow-hidden font-normal text-parchment-dim text-left align-bottom pb-0.5">
                  <Header p={p} i={j} prefix="Rival" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mine.map((p, i) => (
              <tr key={i}>
                <th title={label(p, i, 'Jugador')} className="overflow-hidden font-normal text-left text-parchment pr-1">
                  <Header p={p} i={i} prefix="Jugador" />
                </th>
                {theirs.map((_, j) => {
                  const v = matrix[i][j]
                  const y = mapMine[i][j]
                  const r = mapTheirs[i][j]
                  const selected = sel[0] === i && sel[1] === j
                  const hit = highlight?.has(`${i}-${j}`)
                  const cellLabel = `${label(p, i, 'Jugador')} contra ${label(theirs[j], j, 'Rival')}: principal ${v ?? 'sin puntuar'}${y !== null ? `, si elijo yo el mapa ${y}` : ''}${r !== null ? `, si elige el rival ${r}` : ''}`
                  const pick = (l: RatingLayer) => {
                    setSel([i, j])
                    setLayer(l)
                    focusGrid()
                  }
                  return (
                    <td key={j}>
                      <div
                        className={`relative h-12 border transition-colors ${
                          v === null ? 'border-dashed border-rim-bright bg-surface-3' : RATING_CLASSES[v]
                        } ${selected ? 'ring-2 ring-gold-bright' : ''} ${hit ? 'outline outline-2 outline-crimson-bright -outline-offset-2' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => pick('neutral')}
                          aria-label={cellLabel}
                          className={`absolute inset-0 w-full font-display text-sm pb-3 ${v === null ? 'text-parchment-dim/50' : ''} ${
                            selected && layer === 'neutral' ? 'bg-gold-bright/10' : ''
                          }`}
                        >
                          {v ?? '·'}
                        </button>
                        {/* Y: I pick the map · R: they pick the map. Empty = same as the main value. */}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => pick('mine')}
                          aria-label={`${label(p, i, 'Jugador')} contra ${label(theirs[j], j, 'Rival')}: si elijo yo el mapa ${y ?? 'igual que el principal'}`}
                          className={`absolute bottom-0 left-0 w-1/2 h-4 text-[9px] leading-4 text-left pl-1 ${
                            y !== null ? `${RATING_CLASSES[y]} border-t border-r` : 'text-parchment-dim/40 hover:text-parchment'
                          } ${selected && layer === 'mine' ? 'ring-1 ring-gold-bright' : ''}`}
                        >
                          Y{y ?? ''}
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => pick('theirs')}
                          aria-label={`${label(p, i, 'Jugador')} contra ${label(theirs[j], j, 'Rival')}: si elige el rival el mapa ${r ?? 'igual que el principal'}`}
                          className={`absolute bottom-0 right-0 w-1/2 h-4 text-[9px] leading-4 text-right pr-1 ${
                            r !== null ? `${RATING_CLASSES[r]} border-t border-l` : 'text-parchment-dim/40 hover:text-parchment'
                          } ${selected && layer === 'theirs' ? 'ring-1 ring-gold-bright' : ''}`}
                        >
                          R{r ?? ''}
                        </button>
                      </div>
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
        Editando: <span className="text-gold-bright">{LAYER_LABELS[layer]}</span>. Toca una celda y pulsa 1–7: salta a la siguiente. En cada casilla, <b>Y</b> = valor si elijo yo el
        mapa y <b>R</b> = si lo elige el rival; vacío significa igual que el principal. Teclas: N / Y / R cambian de valor, flechas para moverte, Supr para borrar.
      </p>
    </div>
  )
}
