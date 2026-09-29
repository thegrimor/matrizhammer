export const MIN_RATING = 1
export const MAX_RATING = 7
export const NEUTRAL_RATING = 4

// One literal class string per rating (see dispositions.ts on why they are not built up).
export const RATING_CLASSES: Record<number, string> = {
  1: 'bg-r1/25 text-r1 border-r1/60',
  2: 'bg-r2/25 text-r2 border-r2/60',
  3: 'bg-r3/25 text-r3 border-r3/60',
  4: 'bg-r4/25 text-r4 border-r4/60',
  5: 'bg-r5/25 text-r5 border-r5/60',
  6: 'bg-r6/25 text-r6 border-r6/60',
  7: 'bg-r7/25 text-r7 border-r7/60',
}

export const RATING_KEYPAD_CLASSES = RATING_CLASSES
