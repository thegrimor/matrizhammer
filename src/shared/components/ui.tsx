import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function SectionHeader({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-rim-bright pb-1.5 mb-3">
      <h2 className="font-display text-[11px] uppercase tracking-widest text-crimson-bright">{children}</h2>
      {right}
    </div>
  )
}

const BTN = 'font-display text-[10px] uppercase tracking-widest px-3 py-2 border transition-colors disabled:opacity-40'

export function Button({
  variant = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' }) {
  const tone =
    variant === 'primary'
      ? 'border-crimson bg-crimson/20 text-crimson-bright hover:bg-crimson/35'
      : variant === 'danger'
        ? 'border-rim-bright text-parchment-dim hover:border-crimson hover:text-crimson-bright'
        : 'border-rim-bright text-parchment hover:border-gold hover:text-gold-bright'
  return <button type="button" {...props} className={`${BTN} ${tone} ${className}`} />
}

export const inputClass =
  'w-full bg-surface-3 border border-rim-bright px-2 py-1.5 text-[13px] text-parchment placeholder:text-parchment-dim/60 focus:outline-none focus:border-gold'
