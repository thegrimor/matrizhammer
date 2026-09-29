import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { popStep, pushStep, resetSteps, setOpponentName, setOpponentPlayer, setRating, setResult } from '@/store/eventsSlice'
import { eventPath } from '@/core/constants/routes'
import { replaySteps } from '@/core/solver/roundFlow'
import { ratingSets } from '@/core/utils/ratings'
import { PlayerRow } from '@/features/events/components/PlayerRow'
import { MatrixGrid } from '../components/MatrixGrid'
import { RoundAssistant } from '../components/RoundAssistant'
import { ResultsPanel } from '../components/ResultsPanel'
import { useRoundAnalysis } from '../hooks/useRoundAnalysis'
import { inputClass, SectionHeader } from '@/shared/components/ui'

type Tab = 'matrix' | 'assistant' | 'results'

export function RoundPage() {
  const { eventId = '', roundId = '' } = useParams()
  const dispatch = useAppDispatch()
  const event = useAppSelector((s) => s.events.events.find((e) => e.id === eventId))
  const round = event?.rounds.find((r) => r.id === roundId)
  const [tab, setTab] = useState<Tab>('matrix')
  const [showOpponents, setShowOpponents] = useState(false)

  const numeric = useMemo(() => (round ? ratingSets(round) : null), [round])
  const state = useRoundAnalysis(numeric, event?.teamSize ?? 6, round?.steps ?? [])
  const progress = useMemo(() => {
    if (!round || !event) return null
    try {
      return replaySteps(event.teamSize, round.steps)
    } catch {
      return null
    }
  }, [round, event])

  if (!event || !round || !progress) {
    return (
      <div>
        <p className="text-parchment-dim">Ronda no encontrada.</p>
        <Link to="/" className="text-gold-bright underline">Volver</Link>
      </div>
    )
  }
  const ref = { eventId, roundId }
  const highlight = new Set(progress.matches.map((m) => `${m.mine}-${m.theirs}`))
  const TABS: [Tab, string][] = [['matrix', 'Matriz'], ['assistant', 'Asistente'], ['results', 'Resultado']]

  const matrixPanel = (
    <section>
      <SectionHeader>Matriz</SectionHeader>
      <MatrixGrid
        mine={event.myTeam}
        theirs={round.opponents}
        matrix={round.matrix}
        mapMine={round.mapMine}
        mapTheirs={round.mapTheirs}
        highlight={highlight}
        onSet={(layer, row, col, value) => dispatch(setRating({ ...ref, layer, row, col, value }))}
      />
      <button
        type="button"
        onClick={() => setShowOpponents((v) => !v)}
        className="mt-4 font-display text-[10px] uppercase tracking-widest text-gold-bright hover:underline"
      >
        {showOpponents ? '▾' : '▸'} Jugadores rivales
      </button>
      {showOpponents && (
        <div className="mt-2 space-y-1.5">
          {round.opponents.map((p, j) => (
            <PlayerRow
              key={j}
              index={j}
              player={p}
              placeholder={`Rival ${j + 1}`}
              armyFirst
              onChange={(patch) => dispatch(setOpponentPlayer({ ...ref, index: j, patch }))}
            />
          ))}
        </div>
      )}
    </section>
  )

  const assistantPanel = (
    <section>
      <SectionHeader>Asistente de ronda</SectionHeader>
      <RoundAssistant
        round={round}
        mine={event.myTeam}
        filled={numeric !== null}
        ratings={numeric}
        state={state}
        onPush={(step) => dispatch(pushStep({ ...ref, step }))}
        onUndo={() => dispatch(popStep(ref))}
        onReset={() => dispatch(resetSteps(ref))}
      />
    </section>
  )

  const resultsPanel = (
    <section>
      <ResultsPanel
        round={round}
        mine={event.myTeam}
        matches={progress.matches}
        ratings={numeric}
        complete={progress.phase === 'done'}
        teamSize={event.teamSize}
        onSet={(key, patch) => dispatch(setResult({ ...ref, key, patch }))}
      />
    </section>
  )

  return (
    <div>
      <Link to={eventPath(event.id)} className="text-[10px] uppercase tracking-widest text-parchment-dim hover:text-gold-bright">
        ← {event.name}
      </Link>
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg uppercase tracking-widest text-crimson-bright">Ronda {round.number}</h1>
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Equipo rival"
          aria-label="Nombre del equipo rival"
          value={round.opponentName}
          maxLength={80}
          onChange={(e) => dispatch(setOpponentName({ ...ref, name: e.target.value }))}
        />
      </div>

      <div className="flex gap-1 mb-4 lg:hidden sticky z-10 bg-page py-1" style={{ top: '2.75rem' }} role="tablist">
        {TABS.map(([id, text]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 font-display text-[10px] uppercase tracking-widest py-2 border ${
              tab === id ? 'border-crimson bg-crimson/20 text-crimson-bright' : 'border-rim-bright text-parchment-dim'
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {/* One copy of each panel: tabs on small screens, two columns from lg up. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-8">
        <div className={`${tab === 'matrix' ? 'block' : 'hidden'} lg:block lg:row-span-2`}>{matrixPanel}</div>
        <div className={`${tab === 'assistant' ? 'block' : 'hidden'} lg:block`}>{assistantPanel}</div>
        <div className={`${tab === 'results' ? 'block' : 'hidden'} lg:block`}>{resultsPanel}</div>
      </div>
    </div>
  )
}
