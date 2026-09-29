import { useState } from 'react'
import type { Player, Round, Step } from '@/types'
import { matchRating, type StepAnalysis } from '@/core/solver/roundFlow'
import type { RatingSet } from '@/core/solver/pairingGame'
import type { AnalysisState } from '../hooks/useRoundAnalysis'
import { AssistantMatrix } from './AssistantMatrix'
import { myLabel, myLabelWithArmy, rivalLabel } from '@/core/utils/labels'
import { Button, inputClass, SectionHeader } from '@/shared/components/ui'

interface Props {
  round: Round
  mine: Player[]
  filled: boolean
  ratings: RatingSet | null
  state: AnalysisState
  onPush: (step: Step) => void
  onUndo: () => void
  onReset: () => void
}

const MODULE_NAMES = { IS: 'Initial Skirmish', ME: 'Main Engagement', CH: 'Champion System' } as const
const PHASE_NAMES = { defenders: 'Defensores', attackers: 'Atacantes', refusals: 'Rechazos' } as const

const same = (a: number | [number, number], b: number | [number, number]) =>
  Array.isArray(a) && Array.isArray(b) ? a[0] === b[0] && a[1] === b[1] : a === b

export function RoundAssistant({ round, mine, filled, ratings, state, onPush, onUndo, onReset }: Props) {
  const theirs = round.opponents
  const mineName = (i: number) => myLabel(mine[i], i)
  const theirName = (j: number) => rivalLabel(theirs[j], j)
  const mineOption = (i: number) => myLabelWithArmy(mine[i], i)
  const theirOption = (j: number) => rivalLabel(theirs[j], j)
  const n = mine.length

  if (!filled) {
    return (
      <div className="border border-dashed border-rim-bright p-4 text-[12px] text-parchment-dim">
        Rellena la matriz completa ({n * n} celdas) para calcular las recomendaciones.
      </div>
    )
  }
  if (state.error) return <div className="border border-crimson p-4 text-crimson-bright text-[12px]">Error al calcular: {state.error}</div>
  const { analysis } = state
  if (!analysis) return <div className="p-4 text-[12px] text-parchment-dim animate-pulse">Calculando…</div>

  const { progress, current } = analysis
  const perGame = (analysis.current?.expectedTotal ?? analysis.fixedTotal) / n

  return (
    <div className={state.loading ? 'opacity-60 transition-opacity' : ''}>
      <div className="grid grid-cols-2 gap-2 mb-4 text-center">
        <div className="border border-rim bg-surface-2 p-2">
          <div className="text-[9px] uppercase tracking-widest text-parchment-dim">Total esperado</div>
          <div className="font-display text-lg text-gold-bright">{(current?.expectedTotal ?? analysis.fixedTotal).toFixed(1)}</div>
          <div className="text-[9px] text-parchment-dim">de {7 * n} · neutro {4 * n}</div>
        </div>
        <div className="border border-rim bg-surface-2 p-2">
          <div className="text-[9px] uppercase tracking-widest text-parchment-dim">Media por partida</div>
          <div className="font-display text-lg text-gold-bright">{perGame.toFixed(2)}</div>
          <div className="text-[9px] text-parchment-dim">al inicio: {(analysis.initialExpected / n).toFixed(2)}</div>
        </div>
      </div>

      <div className="mb-4">
        <AssistantMatrix round={round} mine={mine} progress={progress} current={current} />
      </div>

      {current ? (
        <StepPanel
          key={`${progress.moduleIndex}-${current.phase}-${round.steps.length}`}
          current={current}
          mineName={mineName}
          theirName={theirName}
          mineOption={mineOption}
          theirOption={theirOption}
          moduleNumber={progress.moduleIndex + 1}
          moduleCount={progress.modules.length}
          state={progress}
          onConfirm={onPush}
        />
      ) : (
        <div className="border border-neon/50 bg-neon/5 p-3 text-[12px] text-neon">
          Pareo completo. Anota los resultados reales en la pestaña «Resultado».
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onUndo} disabled={round.steps.length === 0}>
          Deshacer paso
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (round.steps.length === 0 || window.confirm('¿Reiniciar el pareo de esta ronda?')) onReset()
          }}
          disabled={round.steps.length === 0}
        >
          Reiniciar pareo
        </Button>
      </div>

      <div className="mt-5">
        <SectionHeader>Partidas decididas ({progress.matches.length}/{n})</SectionHeader>
        {progress.matches.length === 0 ? (
          <p className="text-[11px] text-parchment-dim">Todavía ninguna.</p>
        ) : (
          <ul className="space-y-1">
            {progress.matches.map((m, k) => (
              <li key={k} className="flex items-center justify-between gap-2 border border-rim bg-surface-2 px-2 py-1 text-[12px]">
                <span className="truncate">
                  {mineName(m.mine)} <span className="text-parchment-dim">vs</span> {theirName(m.theirs)}
                </span>
                <span className="font-display text-gold-bright">{ratings ? matchRating(ratings, m) : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface PanelProps {
  current: StepAnalysis
  mineName: (i: number) => string
  theirName: (i: number) => string
  /** Same as the names above but with the army, used inside the dropdowns. */
  mineOption: (i: number) => string
  theirOption: (i: number) => string
  moduleNumber: number
  moduleCount: number
  state: import('@/core/solver/roundFlow').Progress
  onConfirm: (step: Step) => void
}

function StepPanel({ current, mineName, theirName, mineOption, theirOption, moduleNumber, moduleCount, state, onConfirm }: PanelProps) {
  const fmt = (v: number | [number, number], name: (i: number) => string) =>
    Array.isArray(v) ? `${name(v[0])} + ${name(v[1])}` : name(v)
  const [myPick, setMyPick] = useState(current.recMine)
  const [theirPick, setTheirPick] = useState(current.recTheirs)

  const mineLabel =
    current.phase === 'defenders' ? 'Tu defensor' : current.phase === 'attackers' ? 'Tus atacantes' : 'Su atacante al que se enfrenta tu defensor'
  const theirLabel =
    current.phase === 'defenders' ? 'Defensor rival' : current.phase === 'attackers' ? 'Atacantes rivales' : 'Tu atacante al que se enfrenta su defensor'
  // Option labels: in the refusal step `mineOptions` are THEIR players and vice versa.
  const mineOptionFor = current.phase === 'refusals' ? theirOption : mineOption
  const theirOptionFor = current.phase === 'refusals' ? mineOption : theirOption

  const confirm = () => {
    if (current.phase === 'defenders')
      onConfirm({ kind: 'defenders', mine: myPick as number, theirs: theirPick as number, recMine: current.recMine as number, recTheirs: current.recTheirs as number })
    else if (current.phase === 'attackers')
      onConfirm({ kind: 'attackers', mine: myPick as [number, number], theirs: theirPick as [number, number], recMine: current.recMine as [number, number], recTheirs: current.recTheirs as [number, number] })
    else
      onConfirm({ kind: 'refusals', mine: myPick as number, theirs: theirPick as number, recMine: current.recMine as number, recTheirs: current.recTheirs as number })
  }

  const select = (
    options: (number | [number, number])[],
    value: number | [number, number],
    onChange: (v: number | [number, number]) => void,
    name: (i: number) => string,
    aria: string,
  ) => (
    <select
      className={inputClass}
      aria-label={aria}
      value={options.findIndex((o) => same(o, value))}
      onChange={(e) => onChange(options[Number(e.target.value)])}
    >
      {options.map((o, k) => (
        <option key={k} value={k}>
          {fmt(o, name)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="border border-rim-bright bg-surface-2 p-3">
      <div className="text-[9px] uppercase tracking-widest text-parchment-dim mb-1">
        Módulo {moduleNumber}/{moduleCount} · {MODULE_NAMES[current.moduleKind]}
      </div>
      <h3 className="font-display text-sm uppercase tracking-widest text-crimson-bright mb-3">
        Paso: {PHASE_NAMES[current.phase]}
      </h3>

      {current.phase !== 'defenders' && state.defenderMine !== undefined && (
        <p className="text-[11px] text-parchment-dim mb-3">
          Defensores: <span className="text-parchment">{mineName(state.defenderMine)}</span> vs{' '}
          <span className="text-parchment">{theirName(state.defenderTheirs!)}</span>
          {current.phase === 'refusals' && state.attackersMine && state.attackersTheirs && (
            <>
              {' '}· Atacantes: <span className="text-parchment">{mineName(state.attackersMine[0])}, {mineName(state.attackersMine[1])}</span> vs{' '}
              <span className="text-parchment">{theirName(state.attackersTheirs[0])}, {theirName(state.attackersTheirs[1])}</span>
            </>
          )}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-parchment-dim">Recomendado · {mineLabel}</div>
          <div className="border border-neon/50 bg-neon/5 text-neon px-2 py-1.5 text-[13px] mt-1">{fmt(current.recMine, mineOptionFor)}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-widest text-parchment-dim">Previsto · {theirLabel}</div>
          <div className="border border-gold/50 bg-gold/5 text-gold-bright px-2 py-1.5 text-[13px] mt-1">{fmt(current.recTheirs, theirOptionFor)}</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        <label className="block text-[9px] uppercase tracking-widest text-parchment-dim">
          Lo que eliges tú
          <div className="mt-1 normal-case tracking-normal text-[13px]">
            {select(current.mineOptions, myPick, setMyPick, mineOptionFor, 'Tu elección')}
          </div>
        </label>
        <label className="block text-[9px] uppercase tracking-widest text-parchment-dim">
          Lo que revela el rival
          <div className="mt-1 normal-case tracking-normal text-[13px]">
            {select(current.theirOptions, theirPick, setTheirPick, theirOptionFor, 'Elección del rival')}
          </div>
        </label>
      </div>

      <Button variant="primary" className="mt-4 w-full" onClick={confirm}>
        Confirmar paso
      </Button>
    </div>
  )
}
