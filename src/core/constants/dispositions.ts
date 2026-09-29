// Force Dispositions — ids/names/colours copied from cogitador-consulta's
// `missionDeckColors.ts` (the Primary Mission decks). Colours are literal class strings on
// purpose: Tailwind's scanner only sees full class names in source.
export interface DispositionInfo {
  id: string
  name: string
  text: string
  bar: string
}

export const DISPOSITIONS: DispositionInfo[] = [
  { id: 'take-and-hold', name: 'Take and Hold', text: 'text-deck-hold', bar: 'bg-deck-hold' },
  { id: 'purge-the-foe', name: 'Purge the Foe', text: 'text-deck-purge', bar: 'bg-deck-purge' },
  { id: 'disruption', name: 'Disruption', text: 'text-deck-disruption', bar: 'bg-deck-disruption' },
  { id: 'reconnaissance', name: 'Reconnaissance', text: 'text-deck-recon', bar: 'bg-deck-recon' },
  { id: 'priority-assets', name: 'Priority Assets', text: 'text-deck-priority', bar: 'bg-deck-priority' },
]

export function dispositionById(id: string): DispositionInfo | undefined {
  return DISPOSITIONS.find((d) => d.id === id)
}
