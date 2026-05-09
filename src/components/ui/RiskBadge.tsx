import type { RiskLevel } from '@/types'

interface RiskBadgeProps {
  risk: RiskLevel | null
}

const riskStyles: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  if (!risk) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskStyles[risk]}`}>
      {risk} Risk
    </span>
  )
}
