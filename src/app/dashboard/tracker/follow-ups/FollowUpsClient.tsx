'use client'

import { useState, useTransition } from 'react'
import { markFollowUpCompleteAction } from './actions'

interface FollowUp {
  id: string
  follow_up_type: string
  follow_up_reason: string | null
  related_type: string
  related_label: string
  owner_name: string
  due_date: string
  status: string
  notes: string | null
  completed_at: string | null
}

interface Props {
  followUps: FollowUp[]
  owners: { id: string; full_name: string }[]
}

const STATUS_FILTER = ['All', 'Pending', 'Overdue', 'Completed'] as const
const TYPE_FILTER = ['All', 'Client Call', 'Candidate Check-in', 'Role Update', 'Interview Follow-up', 'Offer Follow-up', 'Reference Check', 'Other']

function isOverdue(fu: FollowUp) {
  return fu.status === 'pending' && new Date(fu.due_date) < new Date(new Date().toDateString())
}

export function FollowUpsClient({ followUps, owners }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [filterOwner, setFilterOwner] = useState<string>('All')
  const [filterType, setFilterType] = useState<string>('All')
  const [completing, setCompleting] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleComplete(id: string) {
    setCompleting(id)
    startTransition(async () => {
      await markFollowUpCompleteAction(id)
      setCompleting(null)
    })
  }

  const filtered = followUps.filter(fu => {
    const overdue = isOverdue(fu)
    if (filterStatus === 'Pending' && (fu.status !== 'pending' || overdue)) return false
    if (filterStatus === 'Overdue' && !overdue) return false
    if (filterStatus === 'Completed' && fu.status !== 'completed') return false
    if (filterOwner !== 'All' && fu.owner_name !== filterOwner) return false
    if (filterType !== 'All' && fu.follow_up_type !== filterType) return false
    return true
  })

  const overdueCount = followUps.filter(isOverdue).length

  return (
    <div>
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{overdueCount} overdue follow-up{overdueCount !== 1 ? 's' : ''} require attention.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
          {STATUS_FILTER.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="All">All Owners</option>
          {owners.map(o => <option key={o.id} value={o.full_name}>{o.full_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
          {TYPE_FILTER.map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {!filtered.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No follow-ups match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Related To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(fu => {
                const overdue = isOverdue(fu)
                const rowClass = overdue ? 'bg-red-50' : 'hover:bg-gray-50'
                return (
                  <tr key={fu.id} className={`transition-colors ${rowClass}`}>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">{fu.follow_up_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 text-xs font-medium">{fu.related_label}</p>
                      <p className="text-gray-400 text-xs capitalize">{fu.related_type}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-40 truncate">{fu.follow_up_reason ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fu.owner_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                        {new Date(fu.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {overdue && ' — Overdue'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fu.status === 'completed'
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Completed</span>
                        : overdue
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {fu.status === 'pending' && (
                        <button
                          onClick={() => handleComplete(fu.id)}
                          disabled={completing === fu.id}
                          className="text-xs font-medium text-gray-500 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {completing === fu.id ? '…' : 'Complete'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
