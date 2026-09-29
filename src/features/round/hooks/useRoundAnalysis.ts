import { useEffect, useState } from 'react'
import type { Step } from '@/types'
import type { RoundAnalysis } from '@/core/solver/roundFlow'
import type { RatingSet } from '@/core/solver/pairingGame'
import type { SolverRequest, SolverResponse } from '@/infrastructure/solver/solver.worker'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, (r: SolverResponse) => void>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../../infrastructure/solver/solver.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (ev: MessageEvent<SolverResponse>) => {
      pending.get(ev.data.id)?.(ev.data)
      pending.delete(ev.data.id)
    }
  }
  return worker
}

export interface AnalysisState {
  analysis: RoundAnalysis | null
  loading: boolean
  error: string | null
}

interface Settled {
  key: string
  analysis: RoundAnalysis | null
  error: string | null
}

/** Solves the round off the main thread. `ratings` must be null until the main matrix is completely filled in. */
export function useRoundAnalysis(ratings: RatingSet | null, teamSize: number, steps: Step[]): AnalysisState {
  const [settled, setSettled] = useState<Settled | null>(null)
  // Serialising keeps the effect from re-firing when Redux hands back equal-but-new arrays.
  const matrixKey = ratings ? JSON.stringify(ratings) : ''
  const stepsKey = JSON.stringify(steps)
  const key = `${teamSize}|${matrixKey}|${stepsKey}`

  useEffect(() => {
    if (!matrixKey) return
    const id = nextId++
    pending.set(id, (res) =>
      setSettled(
        'error' in res
          ? { key, analysis: null, error: res.error }
          : { key, analysis: res.analysis, error: null },
      ),
    )
    const req: SolverRequest = { id, ratings: JSON.parse(matrixKey), teamSize, steps: JSON.parse(stepsKey) }
    getWorker().postMessage(req)
    return () => {
      pending.delete(id)
    }
  }, [key, matrixKey, teamSize, stepsKey])

  if (!matrixKey) return { analysis: null, loading: false, error: null }
  // While a newer request is in flight the previous answer stays visible (dimmed by the caller).
  return { analysis: settled?.analysis ?? null, loading: settled?.key !== key, error: settled?.key === key ? settled.error : null }
}
