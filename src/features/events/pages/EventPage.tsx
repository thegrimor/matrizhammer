import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addRound, removeEvent, removeRound, renameEvent, setMyPlayer } from '@/store/eventsSlice'
import { roundPath } from '@/core/constants/routes'
import { PlayerRow } from '../components/PlayerRow'
import { Button, inputClass, SectionHeader } from '@/shared/components/ui'

export function EventPage() {
  const { eventId = '' } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const event = useAppSelector((s) => s.events.events.find((e) => e.id === eventId))

  if (!event) {
    return (
      <div>
        <p className="text-parchment-dim">Evento no encontrado.</p>
        <Link to="/" className="text-gold-bright underline">Volver</Link>
      </div>
    )
  }

  const last = event.rounds[event.rounds.length - 1]

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-[10px] uppercase tracking-widest text-parchment-dim hover:text-gold-bright">
          ← Eventos
        </Link>
        <input
          className={`${inputClass} mt-2 font-display text-base`}
          aria-label="Nombre del evento"
          value={event.name}
          maxLength={80}
          onChange={(e) => dispatch(renameEvent({ eventId: event.id, name: e.target.value }))}
        />
        <div className="mt-1 text-[10px] uppercase tracking-widest text-parchment-dim">{event.teamSize} jugadores por equipo</div>
      </div>

      <section>
        <SectionHeader>Mi equipo</SectionHeader>
        <div className="space-y-1.5">
          {event.myTeam.map((p, i) => (
            <PlayerRow
              key={i}
              index={i}
              player={p}
              placeholder={`Jugador ${i + 1}`}
              onChange={(patch) => dispatch(setMyPlayer({ eventId: event.id, index: i, patch }))}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          right={
            <div className="flex gap-2">
              <Button onClick={() => dispatch(addRound({ eventId: event.id }))}>+ Ronda</Button>
              {last && (
                <Button onClick={() => dispatch(addRound({ eventId: event.id, copyFromRoundId: last.id }))}>+ Copiar anterior</Button>
              )}
            </div>
          }
        >
          Rondas ({event.rounds.length})
        </SectionHeader>
        {event.rounds.length === 0 ? (
          <p className="text-[12px] text-parchment-dim">Añade la primera ronda cuando conozcas al equipo rival.</p>
        ) : (
          <ul className="space-y-1.5">
            {event.rounds.map((r) => {
              const filled = r.matrix.reduce((s, row) => s + row.filter((v) => v !== null).length, 0)
              const total = event.teamSize * event.teamSize
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 border border-rim bg-surface-2 p-2">
                  <Link to={roundPath(event.id, r.id)} className="min-w-0 flex-1 hover:text-gold-bright">
                    <div className="truncate text-[14px]">
                      Ronda {r.number}
                      {r.opponentName && <span className="text-parchment-dim"> · {r.opponentName}</span>}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-parchment-dim">
                      Matriz {filled}/{total} · {r.steps.length} {r.steps.length === 1 ? 'paso' : 'pasos'}
                    </div>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`¿Borrar la ronda ${r.number}?`)) dispatch(removeRound({ eventId: event.id, roundId: r.id }))
                    }}
                  >
                    Borrar
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm(`¿Borrar «${event.name}»? No se puede deshacer.`)) {
              dispatch(removeEvent(event.id))
              navigate('/')
            }
          }}
        >
          Borrar evento
        </Button>
      </section>
    </div>
  )
}
