'use client'

import { useState } from 'react'
import { formatZAR } from '@/lib/format'

interface Props {
  potentialRevenue: number | null
  onConfirm: (data: { reason: string; lostRevenue: number | null; notes: string }) => void
  onCancel: () => void
}

export function ClosedLostModal({ potentialRevenue, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const [lostRevenue, setLostRevenue] = useState<string>(potentialRevenue != null ? String(potentialRevenue) : '')
  const [notes, setNotes] = useState('')

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Close Lost</h2>
            <p className="text-xs text-gray-500 mt-0.5">Record why this role was lost</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client paused hiring, candidate withdrew, filled internally…"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lost Revenue (ZAR)
              {potentialRevenue != null && <span className="text-gray-400 ml-1">— from potential revenue</span>}
            </label>
            <input
              type="number"
              value={lostRevenue}
              onChange={e => setLostRevenue(e.target.value)}
              placeholder="e.g. 127500"
              className={inputClass}
            />
            {potentialRevenue != null && (
              <p className="text-xs text-gray-400 mt-1">Potential was {formatZAR(potentialRevenue)}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
            <button
              onClick={() => {
                if (!reason.trim()) return
                onConfirm({ reason, lostRevenue: lostRevenue ? Number(lostRevenue) : null, notes })
              }}
              disabled={!reason.trim()}
              className="bg-red-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              Mark Closed Lost
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
