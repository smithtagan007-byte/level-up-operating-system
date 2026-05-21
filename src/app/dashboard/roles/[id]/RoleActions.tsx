'use client'

import { useState } from 'react'
import { updateRoleStatusAction } from '../actions'
import Link from 'next/link'

const PIPELINE_STAGES = ['intake', 'sourcing', 'screening', 'shortlisted', 'submitted', 'interviewing', 'offer'] as const
const TERMINAL_STAGES = ['placed', 'closed'] as const
const ALL_STATUSES = [...PIPELINE_STAGES, ...TERMINAL_STAGES] as const

interface RoleActionsProps {
  roleId: string
  currentStatus: string
  intakeCompleted: boolean
}

export function RoleActions({ roleId, currentStatus, intakeCompleted }: RoleActionsProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus) return
    setPending(true)
    setError(null)
    try {
      await updateRoleStatusAction(roleId, newStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const currentIndex = ALL_STATUSES.indexOf(currentStatus as typeof ALL_STATUSES[number])

  function stageButton(status: string, index: number) {
    const isCurrentStatus = status === currentStatus
    const isBlocked = status === 'sourcing' && !intakeCompleted
    const isPast = index < currentIndex

    return (
      <button
        key={status}
        onClick={() => handleStatusChange(status)}
        disabled={pending || isCurrentStatus || isBlocked}
        title={isBlocked ? 'Complete intake form first' : undefined}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
          isCurrentStatus
            ? 'bg-gray-900 text-white cursor-default'
            : isPast
            ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-50'
            : isBlocked
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
        }`}
      >
        {isBlocked ? `${status} 🔒` : status}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {!intakeCompleted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-yellow-800">
            Sourcing is locked until the intake form is complete.
          </p>
          <Link
            href={`/dashboard/roles/${roleId}/intake`}
            className="ml-4 shrink-0 bg-yellow-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-900 transition-colors"
          >
            Complete Intake →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pipeline</p>
          <div className="flex gap-2 flex-wrap">
            {PIPELINE_STAGES.map((status, index) => stageButton(status, index))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Outcome</p>
          <div className="flex gap-2">
            {TERMINAL_STAGES.map((status, index) => stageButton(status, PIPELINE_STAGES.length + index))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
