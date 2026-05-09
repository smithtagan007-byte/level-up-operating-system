import type { CandidateTier } from '@/types'

interface CandidateTierBadgeProps {
  tier: CandidateTier | null
}

const tierStyles: Record<CandidateTier, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  Reject: 'bg-red-100 text-red-800',
}

const tierLabels: Record<CandidateTier, string> = {
  A: 'A — Exceptional',
  B: 'B — Strong',
  C: 'C — Viable',
  D: 'D — Weak',
  Reject: 'Reject',
}

export function CandidateTierBadge({ tier }: CandidateTierBadgeProps) {
  if (!tier) return <span className="text-gray-400 text-xs">Ungraded</span>
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierStyles[tier]}`}>
      {tierLabels[tier]}
    </span>
  )
}
