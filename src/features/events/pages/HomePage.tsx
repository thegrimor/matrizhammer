import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addEvent, importEvent, removeEvent } from '@/store/eventsSlice'
import { eventPath } from '@/core/constants/routes'
import { DEFAULT_TEAM_SIZE, MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '@/core/solver/pairingGame'
import { decodeEvent } from '@/core/utils/codec'
import { Button, inputClass, SectionHeader } from '@/shared/components/ui'

export function HomePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const events = useAppSelector((s) => s.events.events)
  const [name, setName] = useState('')
  const [size, setSize] = useState(DEFAULT_TEAM_SIZE)
  const [code, setCode] = useState('')
  const [importError, setImportError] = useState('')

  const create = () => {
    const action = dispatch(addEvent(name, size))
    navigate(eventPath(action.payload.id))
  }

  const doImport = (text: string) => {
    const ev = decodeEvent(text)
    if (!ev) {
      setImportError('No se pudo leer el código o el JSON.')
      return
    }
    dispatch(importEvent(ev))
    setCode('')
    setImportError('')
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader>Nuevo evento</SectionHeader>
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
          <input className={inputClass} placeholder="Nombre del torneo" aria-label="Nombre del evento" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <select className={inputClass} aria-label="Jugadores por equipo" value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {Array.from({ length: MAX_TEAM_SIZE - MIN_TEAM_SIZE + 1 }, (_, k) => MIN_TEAM_SIZE + k).map((n) => (
              <option key={n} value={n}>
                {n} jugadores
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={create}>
            Crear
          </Button>
        </div>
      </section>

      <section>
        <SectionHeader>Eventos ({events.length})</SectionHeader>
        {events.length === 0 ? (
          <p className="text-[12px] text-parchment-dim">Todavía no hay eventos. Crea uno arriba o importa un código.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 border border-rim bg-surface-2 p-2">
                <Link to={eventPath(e.id)} className="min-w-0 flex-1 hover:text-gold-bright">
                  <div className="truncate text-[14px]">{e.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-parchment-dim">
                    {e.teamSize} jugadores · {e.rounds.length} {e.rounds.length === 1 ? 'ronda' : 'rondas'}
                  </div>
                </Link>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm(`¿Borrar «${e.name}»? No se puede deshacer.`)) dispatch(removeEvent(e.id))
                  }}
                >
                  Borrar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader>Importar</SectionHeader>
        <textarea
          className={`${inputClass} h-20`}
          placeholder="Pega aquí un código MH1:… o el JSON de un evento"
          aria-label="Código o JSON a importar"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={() => doImport(code)} disabled={!code.trim()}>
            Importar código
          </Button>
          <label className="font-display text-[10px] uppercase tracking-widest px-3 py-2 border border-rim-bright text-parchment hover:border-gold cursor-pointer">
            Archivo JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) doImport(await f.text())
                e.target.value = ''
              }}
            />
          </label>
          {importError && <span className="text-[11px] text-crimson-bright">{importError}</span>}
        </div>
      </section>
    </div>
  )
}
