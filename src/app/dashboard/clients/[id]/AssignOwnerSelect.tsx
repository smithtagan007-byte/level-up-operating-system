'use client'

import { useState } from 'react'
import { updateClientOwnerAction } from '../actions'

interface AssignOwnerSelectProps {
  clientId: string
  currentOwnerId: string | null
  currentOwnerName: string | null
  clientOwners: { id: string; full_name: string }[]
}

export function AssignOwnerSelect({ clientId, currentOwnerId, currentOwnerName, clientOwners }: AssignOwnerSelectProps) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentOwnerId ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setPending(true)
    setError(null)
    try {
      await updateClientOwnerAction(clientId, selected || null)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-900">{currentOwnerName ?? <span className="text-gray-400">Unassigned</span>}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
        >
          {clientOwners.length === 0 ? null : 'Edit'}
        </button>
        {clientOwners.length === 0 && (
          <span className="text-xs text-yellow-600">(No Client Owners exist yet)</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        autoFocus
      >
        <option value="">Unassigned</option>
        {clientOwners.map((u) => (
          <option key={u.id} value={u.id}>{u.full_name}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex-1 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setSelected(currentOwnerId ?? ''); setError(null) }}
          className="flex-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
