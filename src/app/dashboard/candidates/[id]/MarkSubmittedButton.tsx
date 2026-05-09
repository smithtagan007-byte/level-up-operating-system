'use client'

import { useState, useTransition } from 'react'
import { markSubmittedToClientAction } from './actions'

interface Props {
  candidateId: string
  roleId: string
  clientId: string
  roleTitle: string
}

export function MarkSubmittedButton({ candidateId, roleId, clientId, roleTitle }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await markSubmittedToClientAction(candidateId, roleId, clientId, roleTitle)
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setConfirmed(false)
      }
    })
  }

  if (done) {
    return (
      <div className="mt-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          Submitted to Client
        </span>
      </div>
    )
  }

  if (!confirmed) {
    return (
      <div className="mt-3">
        <button
          onClick={() => setConfirmed(true)}
          className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Mark as Submitted to Client
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-600">
        This will mark the candidate as submitted and increment the CV count on the role tracker. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirmed(false)}
          className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
