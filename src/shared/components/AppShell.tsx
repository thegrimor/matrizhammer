import { Link, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-screen bg-page text-parchment">
      <header className="sticky top-0 z-20 border-b border-rim-bright bg-surface-2 flex items-center gap-3 px-4 h-11">
        <Link to="/" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-crimson-bright shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="3" y="3" width="18" height="18" />
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
          <span className="font-display text-xs uppercase tracking-[0.25em] text-crimson-bright">Matrizhammer</span>
        </Link>
        <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-parchment-dim">Matrices por equipos</span>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}
