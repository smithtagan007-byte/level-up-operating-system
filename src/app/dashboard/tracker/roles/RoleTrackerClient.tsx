'use client'

import { useState } from 'react'
import { EditRoleModal } from './EditRoleModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatZAR } from '@/lib/format'

interface RoleRow {
  role_id: string
  role_title: string
  client_name: string
  status: string
  created_at: string
  // tracker fields
  level: string | null
  location: string | null
  delivery_recruiter_name: string | null
  date_opened: string | null
  days_open: number
  cvs_submitted: number
  // legacy tracker revenue (for EditRoleModal)
  expected_revenue: number | null
  actual_revenue: number | null
  revenue_probability: number | null
  next_action: string | null
  next_action_date: string | null
  follow_up_status: string
  // for modal
  role_originator_id: string | null
  delivery_recruiter_id: string | null
  sourced_location: string | null
  // new structured revenue fields
  potential_revenue: number | null
  weighted_forecast_revenue: number | null
  rev_actual_revenue: number | null
  revenue_variance: number | null
  revenue_status: string | null
}

interface Props {
  rows: RoleRow[]
  users: { id: string; full_name: string }[]
}

const fuStyles: Record<string, string> = {
  none: 'text-gray-300',
  pending: 'text-yellow-600',
  overdue: 'text-red-600',
}

const revStatusStyles: Record<string, string> = {
  Forecast: 'bg-gray-100 text-gray-600',
  Hot: 'bg-amber-100 text-amber-800',
  Placed: 'bg-emerald-100 text-emerald-800',
  'Closed Lost': 'bg-red-100 text-red-700',
  Invoiced: 'bg-blue-100 text-blue-700',
  Paid: 'bg-emerald-200 text-emerald-900',
}

export function RoleTrackerClient({ rows, users }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingRow = rows.find(r => r.role_id === editingId)

  return (
    <>
      {editingRow && (
        <EditRoleModal
          roleId={editingRow.role_id}
          roleTitle={editingRow.role_title}
          clientName={editingRow.client_name}
          existing={{
            level: editingRow.level ?? undefined,
            location: editingRow.location ?? undefined,
            role_originator_id: editingRow.role_originator_id ?? undefined,
            delivery_recruiter_id: editingRow.delivery_recruiter_id ?? undefined,
            expected_revenue: editingRow.expected_revenue,
            actual_revenue: editingRow.actual_revenue,
            revenue_probability: editingRow.revenue_probability,
            sourced_location: editingRow.sourced_location ?? undefined,
            next_action: editingRow.next_action ?? undefined,
            next_action_date: editingRow.next_action_date ?? undefined,
            follow_up_status: editingRow.follow_up_status,
          }}
          users={users}
          onClose={() => setEditingId(null)}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Client', 'Role', 'Level', 'Location', 'Status', 'Recruiter', 'Days Open', 'CVs Sent', 'Potential Rev', 'Weighted', 'Actual Rev', 'Rev. Status', 'Variance', 'Next Action', 'Next Action Date', 'Follow-Up', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(row => (
              <tr key={row.role_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{row.client_name}</td>
                <td className="px-4 py-3 text-gray-800">{row.role_title}</td>
                <td className="px-4 py-3 text-gray-600">{row.level ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">{row.location ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-gray-600">{row.delivery_recruiter_name ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${row.days_open > 30 ? 'text-red-600' : row.days_open > 14 ? 'text-yellow-600' : 'text-gray-700'}`}>
                    {row.days_open}d
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{row.cvs_submitted}</td>
                <td className="px-4 py-3 text-gray-600">
                  {row.potential_revenue != null ? formatZAR(row.potential_revenue) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-blue-600">
                  {row.weighted_forecast_revenue != null ? formatZAR(row.weighted_forecast_revenue) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 font-medium text-emerald-600">
                  {row.rev_actual_revenue != null ? formatZAR(row.rev_actual_revenue) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {row.revenue_status != null
                    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${revStatusStyles[row.revenue_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {row.revenue_status}
                      </span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {row.revenue_variance != null
                    ? <span className={`font-medium text-xs ${row.revenue_variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {row.revenue_variance >= 0 ? '+' : ''}{formatZAR(row.revenue_variance)}
                      </span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 max-w-36 truncate text-gray-600">{row.next_action ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">
                  {row.next_action_date
                    ? new Date(row.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium capitalize ${fuStyles[row.follow_up_status] ?? 'text-gray-300'}`}>
                    {row.follow_up_status === 'none' ? '—' : row.follow_up_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditingId(row.role_id)} className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
