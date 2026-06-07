'use client'

import { useTransition } from 'react'
import { updateRoleStatusAction } from '../actions'
import { ChevronRight } from 'lucide-react'

const PIPELINE = ['intake', 'sourcing', 'screening', 'shortlisted', 'submitted', 'interviewing', 'offer'] as const
const LABELS: Record<string, string> = {
  intake: 'Intake', sourcing: 'Sourcing', screening: 'Screening',
  shortlisted: 'Shortlisted', submitted: 'Submitted',
  interviewing: 'Interviewing', offer: 'Offer',
}

interface Props {
  roleId: string
  currentStatus: string
  intakeCompleted: boolean
}

export function RoleStageBar({ roleId, currentStatus, intakeCompleted }: Props) {
  const [pending, startTransition] = useTransition()
  const currentIndex = PIPELINE.indexOf(currentStatus as typeof PIPELINE[number])

  function advance(newStatus: string) {
    if (newStatus === currentStatus || pending) return
    if (newStatus === 'sourcing' && !intakeCompleted) return
    startTransition(async () => {
      await updateRoleStatusAction(roleId, newStatus)
    })
  }

  // Only show for active pipeline stages
  if (['placed', 'closed'].includes(currentStatus)) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE.map((stage, i) => {
        const isCurrent = stage === currentStatus
        const isPast = i < currentIndex
        const isLocked = stage === 'sourcing' && !intakeCompleted && !isPast

        return (
          <div key={stage} className="flex items-center gap-1">
            <button
              onClick={() => advance(stage)}
              disabled={pending || isCurrent || isLocked}
              title={isLocked ? 'Complete intake first' : undefined}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-gray-900 text-white cursor-default'
                  : isPast
                  ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  : isLocked
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {LABELS[stage]}
            </button>
            {i < PIPELINE.length - 1 && (
              <ChevronRight size={12} className="text-gray-300 shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}
