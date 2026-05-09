'use client'

import { useState } from 'react'
import { updateApprovalAction } from '../actions'

type DecisionStatus = 'approved' | 'rework' | 'rejected'

interface ApprovalPanelProps {
  reviewId: string
  panelType: 'client_owner' | 'talent_manager'
  currentStatus: string
  currentNotes: string | null
  actionedByName: string | null
  canAction: boolean
}

const DECISIONS: { value: DecisionStatus; label: string; style: string; activeStyle: string }[] = [
  {
    value: 'approved',
    label: 'Approve',
    style: 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800',
    activeStyle: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  },
  {
    value: 'rework',
    label: 'Request Rework',
    style: 'border-gray-200 text-gray-600 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-800',
    activeStyle: 'border-yellow-500 bg-yellow-50 text-yellow-800',
  },
  {
    value: 'rejected',
    label: 'Reject',
    style: 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-800',
    activeStyle: 'border-red-500 bg-red-50 text-red-800',
  },
]

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-emerald-100 text-emerald-800',
  rework: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
}

export function ApprovalPanel({
  reviewId,
  panelType,
  currentStatus,
  currentNotes,
  actionedByName,
  canAction,
}: ApprovalPanelProps) {
  const [selected, setSelected] = useState<DecisionStatus | null>(null)
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notesRequired = selected === 'rework' || selected === 'rejected'
  const label = panelType === 'client_owner' ? 'Client Owner' : 'Talent Manager'

  async function handleConfirm() {
    if (!selected) return
    if (notesRequired && !notes.trim()) {
      setError('Notes are required when requesting rework or rejecting.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateApprovalAction(reviewId, panelType, selected, notes)
      setSelected(null)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label} Decision</p>
          {actionedByName && currentStatus !== 'pending' && (
            <p className="text-xs text-gray-400 mt-0.5">by {actionedByName}</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
          {currentStatus === 'rework' ? 'Rework Requested' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </span>
      </div>

      {/* Existing notes */}
      {currentNotes && currentStatus !== 'pending' && (
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{currentNotes}</p>
        </div>
      )}

      {/* Action buttons — only if user has right role */}
      {canAction ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {DECISIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => { setSelected(selected === d.value ? null : d.value); setError(null) }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${selected === d.value ? d.activeStyle : d.style}`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes{notesRequired ? <span className="text-red-500 ml-1">*</span> : <span className="text-gray-400 ml-1">(optional for approval)</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    selected === 'approved'
                      ? 'Any comments for the record…'
                      : selected === 'rework'
                      ? 'What needs to be addressed before this candidate can progress?'
                      : 'Reason for rejection…'
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setSelected(null); setNotes(''); setError(null) }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors ${
                    selected === 'approved'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : selected === 'rework'
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {pending ? 'Saving…' : `Confirm ${DECISIONS.find(d => d.value === selected)?.label}`}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          {panelType === 'client_owner'
            ? 'Only the recruiter assigned to this client can action this panel.'
            : 'Only Talent Managers or Directors can action this panel.'}
        </p>
      )}
    </div>
  )
}
