export const STAGE_THRESHOLDS: Record<string, number> = {
  intake:               2,
  sourcing:             5,
  screening:            4,
  in_review:            3,
  approved:             2,   // approved → should be submitted quickly
  submitted:            3,
  interview:            5,
  offer:                3,
  started:              90,  // 90-day probation window
  // probation_completed intentionally omitted — no aging on success
}

export type AgeColor = 'gray' | 'amber' | 'red'

export interface StageAgeInfo {
  days: number
  color: AgeColor
  label: string
}

export function stageAgeInfo(
  status: string,
  enteredAt: string | null | undefined
): StageAgeInfo | null {
  if (!enteredAt) return null
  const threshold = STAGE_THRESHOLDS[status]
  if (threshold === undefined) return null // closed, probation_completed, etc.

  const entered = new Date(enteredAt)
  const now = new Date()
  const diffMs = now.getTime() - entered.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let color: AgeColor
  if (days >= threshold) {
    color = 'red'
  } else if (days >= Math.ceil(threshold * 0.5)) {
    color = 'amber'
  } else {
    color = 'gray'
  }

  return {
    days,
    color,
    label: days === 0 ? 'Today' : `${days}d`,
  }
}
