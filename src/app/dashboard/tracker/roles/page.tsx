import { createClient } from '@/lib/supabase/server'
import { RoleTrackerClient } from './RoleTrackerClient'

function daysOpen(dateOpened: string | null, dateClosed: string | null): number {
  const start = dateOpened ? new Date(dateOpened) : null
  if (!start) return 0
  const end = dateClosed ? new Date(dateClosed) : new Date()
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export default async function RoleTrackerPage() {
  const supabase = await createClient()

  const [{ data: roles }, { data: trackers }, { data: users }, { data: revenues }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, created_at, clients(id, name)')
      .not('status', 'eq', 'closed')
      .order('created_at', { ascending: false }),
    supabase.from('role_tracker').select('*'),
    supabase.from('user_profiles').select('id, full_name').order('full_name'),
    supabase.from('role_revenue').select('role_id, potential_revenue, weighted_forecast_revenue, actual_revenue, revenue_variance, revenue_status'),
  ])

  const trackerMap = Object.fromEntries((trackers ?? []).map(t => [t.role_id, t]))
  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u.full_name]))
  const revenueMap = Object.fromEntries((revenues ?? []).map(r => [r.role_id, r]))

  const rows = (roles ?? []).map(role => {
    const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { id: string; name: string } | null
    const t = trackerMap[role.id]
    const rev = revenueMap[role.id]

    return {
      role_id: role.id,
      role_title: role.title,
      client_name: client?.name ?? '—',
      status: role.status,
      created_at: role.created_at,
      level: t?.level ?? null,
      location: t?.location ?? null,
      delivery_recruiter_name: t?.delivery_recruiter_id ? (userMap[t.delivery_recruiter_id] ?? null) : null,
      date_opened: t?.date_opened ?? role.created_at,
      days_open: daysOpen(t?.date_opened ?? role.created_at, t?.date_closed ?? null),
      cvs_submitted: t?.cvs_submitted ?? 0,
      next_action: t?.next_action ?? null,
      next_action_date: t?.next_action_date ?? null,
      follow_up_status: t?.follow_up_status ?? 'none',
      role_originator_id: t?.role_originator_id ?? null,
      delivery_recruiter_id: t?.delivery_recruiter_id ?? null,
      sourced_location: t?.sourced_location ?? null,
      // From role_tracker (legacy fields for EditRoleModal)
      expected_revenue: t?.expected_revenue ?? null,
      actual_revenue: t?.actual_revenue ?? null,
      revenue_probability: t?.revenue_probability ?? null,
      // From role_revenue (new structured revenue)
      potential_revenue: rev?.potential_revenue ?? null,
      weighted_forecast_revenue: rev?.weighted_forecast_revenue ?? null,
      rev_actual_revenue: rev?.actual_revenue ?? null,
      revenue_variance: rev?.revenue_variance ?? null,
      revenue_status: rev?.revenue_status ?? null,
    }
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Role Tracker</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {rows.length} active role{rows.length !== 1 ? 's' : ''} — auto-populated from the OS. Click Edit to add tracking details.
        </p>
      </div>

      {!rows.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No active roles. Roles will appear here as they are created.</p>
        </div>
      ) : (
        <RoleTrackerClient rows={rows} users={users ?? []} />
      )}
    </div>
  )
}
