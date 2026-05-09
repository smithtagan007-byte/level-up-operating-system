'use client'

import { useState } from 'react'
import { upsertRoleTrackerAction } from './actions'

interface TrackerData {
  level?: string
  location?: string
  role_originator_id?: string
  delivery_recruiter_id?: string
  expected_revenue?: number | null
  actual_revenue?: number | null
  revenue_probability?: number | null
  sourced_location?: string
  next_action?: string
  next_action_date?: string
  follow_up_status?: string
}

interface Props {
  roleId: string
  roleTitle: string
  clientName: string
  existing: TrackerData
  users: { id: string; full_name: string }[]
  onClose: () => void
}

export function EditRoleModal({ roleId, roleTitle, clientName, existing, users, onClose }: Props) {
  const [data, setData] = useState<TrackerData>(existing)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof TrackerData, value: unknown) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setPending(true)
    setError(null)
    try {
      const fields: Record<string, unknown> = {
        level: data.level || null,
        location: data.location || null,
        role_originator_id: data.role_originator_id || null,
        delivery_recruiter_id: data.delivery_recruiter_id || null,
        expected_revenue: data.expected_revenue ?? null,
        actual_revenue: data.actual_revenue ?? null,
        revenue_probability: data.revenue_probability ?? null,
        sourced_location: data.sourced_location || null,
        next_action: data.next_action || null,
        next_action_date: data.next_action_date || null,
        follow_up_status: data.follow_up_status || 'none',
      }
      await upsertRoleTrackerAction(roleId, fields)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
  const selectClass = `${inputClass} bg-white`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{roleTitle}</h2>
            <p className="text-xs text-gray-500">{clientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <input value={data.level ?? ''} onChange={e => set('level', e.target.value)} placeholder="e.g. Senior" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input value={data.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="e.g. London" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role Originator</label>
              <select value={data.role_originator_id ?? ''} onChange={e => set('role_originator_id', e.target.value)} className={selectClass}>
                <option value="">—</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Recruiter</label>
              <select value={data.delivery_recruiter_id ?? ''} onChange={e => set('delivery_recruiter_id', e.target.value)} className={selectClass}>
                <option value="">—</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expected Revenue (ZAR)</label>
              <input type="number" value={data.expected_revenue ?? ''} onChange={e => set('expected_revenue', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 850000" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Actual Revenue (ZAR)</label>
              <input type="number" value={data.actual_revenue ?? ''} onChange={e => set('actual_revenue', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 850000" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Probability (%)</label>
              <input type="number" min="0" max="100" value={data.revenue_probability ?? ''} onChange={e => set('revenue_probability', e.target.value ? Number(e.target.value) : null)} placeholder="0" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sourced Location</label>
            <input value={data.sourced_location ?? ''} onChange={e => set('sourced_location', e.target.value)} placeholder="e.g. LinkedIn, referral" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Next Action</label>
            <input value={data.next_action ?? ''} onChange={e => set('next_action', e.target.value)} placeholder="e.g. Send shortlist to client" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Next Action Date</label>
              <input type="date" value={data.next_action_date ?? ''} onChange={e => set('next_action_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Follow-Up Status</label>
              <select value={data.follow_up_status ?? 'none'} onChange={e => set('follow_up_status', e.target.value)} className={selectClass}>
                <option value="none">None</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
            <button onClick={handleSave} disabled={pending} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
