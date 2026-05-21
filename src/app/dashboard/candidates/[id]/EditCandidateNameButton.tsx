'use client'

import { useState, useTransition } from 'react'
import { updateCandidateNameAction } from './actions'

interface Props {
  candidateId: string
  currentName: string
}

export function EditCandidateNameButton({ candidateId, currentName }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentName)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === currentName) {
      setEditing(false)
      setValue(currentName)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateCandidateNameAction(candidateId, trimmed)
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update name')
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditing(false)
      setValue(currentName)
      setError(null)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-2xl font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900 w-72"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setValue(currentName); setError(null) }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl font-semibold text-gray-900">{currentName}</h1>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Edit name"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474ZM3 14.25a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H3Z" />
        </svg>
      </button>
    </div>
  )
}
