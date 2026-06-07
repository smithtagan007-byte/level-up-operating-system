import Link from 'next/link'

interface Props {
  roleId: string
  activeTab: string
  candidateCount: number
}

const TABS = [
  { key: 'candidates', label: 'Candidates' },
  { key: 'intake', label: 'Intake' },
  { key: 'team', label: 'Team' },
  { key: 'revenue', label: 'Revenue' },
]

export function RoleTabNav({ roleId, activeTab, candidateCount }: Props) {
  return (
    <div className="flex border-b border-gray-200">
      {TABS.map(tab => {
        const isActive = tab.key === activeTab
        const label =
          tab.key === 'candidates' && candidateCount > 0
            ? `Candidates (${candidateCount})`
            : tab.label
        return (
          <Link
            key={tab.key}
            href={`/dashboard/roles/${roleId}?tab=${tab.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
