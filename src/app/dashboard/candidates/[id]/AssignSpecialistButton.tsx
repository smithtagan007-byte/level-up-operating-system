'use client'

import { useState, useTransition } from 'react'
import { assignCandidateAction } from './actions'

interface Props {
  candidateId: string
  assignedToId: string | null
  assignedToName: string | null
  currentUserId: string
  users: { id: string; full_name: string }[]
}

export function AssignSpecialistButton({ candidateId, assignedToId, assignedToName, currentUserId, users }: Props) {
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(assignedToId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isAssignedToMe = assignedToId === currentUserId

  function handleSave() {
    const newUserId = selectedId === '' ? null : selectedId
    if (newUserId === assignedToId) {
      setEditing(false)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await assignCandidateAction(candidateId, newUserId)
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign')
      }
    })
  }

  function handleAssignToMe() {
    setError(null)
    startTransition(async () => {
      try {
        await assignCandidateAction(candidateId, currentUserId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign')
      }
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <select
          autoFocus
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-700"
        >
          <option value="">Unassigned</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setSelectedId(assignedToId ?? ''); setError(null) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group flex-wrap">
      <span className="text-xs text-gray-500">
        Assigned to:{' '}
        <span className={assignedToName ? 'font-medium text-gray-700' : 'text-gray-400'}>
          {assignedToName ?? 'Unassigned'}
        </span>
      </span>
      <button
        onClick={() => { setEditing(true); setSelectedId(assignedToId ?? '') }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Change assignment"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
        </svg>
      </button>
      {!isAssignedToMe && (
        <button
          onClick={handleAssignToMe}
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          {isPending ? '…' : 'Assign to me'}
        </button>
      )}
    </div>
  )
}
