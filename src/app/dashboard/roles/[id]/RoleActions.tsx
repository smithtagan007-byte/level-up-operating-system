'use client'

import { useState } from 'react'
import { updateRoleStatusAction, markIntakeCompleteAction } from '../actions'

const STATUSES = ['intake', 'sourcing', 'screening', 'interviewing', 'closed'] as const

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

  async function handleMarkIntake() {
    setPending(true)
    setError(null)
    try {
      await markIntakeCompleteAction(roleId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const currentIndex = STATUSES.indexOf(currentStatus as typeof STATUSES[number])

  return (
    <div className="space-y-4">
      {!intakeCompleted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-yellow-800">
            Intake is not yet complete. This role cannot move to Sourcing until intake is marked complete.
          </p>
          <button
            onClick={handleMarkIntake}
            disabled={pending}
            className="ml-4 shrink-0 bg-yellow-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-yellow-900 disabled:opacity-50 transition-colors"
          >
            Mark Intake Complete
          </button>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Move to Stage</p>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((status, index) => {
            const isCurrentStatus = status === currentStatus
            const isBlocked = status === 'sourcing' && !intakeCompleted
            const isPast = index < currentIndex

            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={pending || isCurrentStatus || isBlocked}
                title={isBlocked ? 'Complete intake first' : undefined}
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
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
