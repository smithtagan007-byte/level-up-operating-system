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

  const [{ data: roles }, { data: trackers }, { data: users }, { data: revenues }, { data: teamRows }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, created_at, clients(id, name)')
      .not('status', 'eq', 'closed')
      .order('created_at', { ascending: false }),
    supabase.from('role_tracker').select('*'),
    supabase.from('user_profiles').select('id, full_name').order('full_name'),
    supabase.from('role_revenue').select('role_id, potential_revenue, weighted_forecast_revenue, actual_revenue, revenue_variance, revenue_status'),
    supabase.from('role_team').select('role_id, user_id, role_on_role, user_profiles(full_name)').eq('is_active', true),
  ])

  const trackerMap = Object.fromEntries((trackers ?? []).map(t => [t.role_id, t]))
  const revenueMap = Object.fromEntries((revenues ?? []).map(r => [r.role_id, r]))

  // Build team map: role_id → { clientOwner, deliveryTeam }
  const teamMap: Record<string, { clientOwner: string | null; deliveryTeam: string[] }> = {}
  for (const row of teamRows ?? []) {
    if (!teamMap[row.role_id]) teamMap[row.role_id] = { clientOwner: null, deliveryTeam: [] }
    const up = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles
    const name = (up as { full_name: string } | null)?.full_name ?? 'Unknown'
    if (row.role_on_role === 'client_owner') {
      teamMap[row.role_id].clientOwner = name
    } else {
      teamMap[row.role_id].deliveryTeam.push(name)
    }
  }

  const rows = (roles ?? []).map(role => {
    const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { id: string; name: string } | null
    const t = trackerMap[role.id]
    const rev = revenueMap[role.id]
    const team = teamMap[role.id] ?? { clientOwner: null, deliveryTeam: [] }

    return {
      role_id: role.id,
      role_title: role.title,
      client_name: client?.name ?? '—',
      status: role.status,
      created_at: role.created_at,
      level: t?.level ?? null,
      location: t?.location ?? null,
      client_owner_name: team.clientOwner,
      delivery_team_names: team.deliveryTeam,
      // keep legacy field for EditRoleModal backward-compat
      delivery_recruiter_name: team.deliveryTeam[0] ?? null,
      date_opened: t?.date_opened ?? role.created_at,
      days_open: daysOpen(t?.date_opened ?? role.created_at, t?.date_closed ?? null),
      cvs_submitted: t?.cvs_submitted ?? 0,
      next_action: t?.next_action ?? null,
      next_action_date: t?.next_action_date ?? null,
      follow_up_status: t?.follow_up_status ?? 'none',
      role_originator_id: t?.role_originator_id ?? null,
      delivery_recruiter_id: t?.delivery_recruiter_id ?? null,
      sourced_location: t?.sourced_location ?? null,
      expected_revenue: t?.expected_revenue ?? null,
      actual_revenue: t?.actual_revenue ?? null,
      revenue_probability: t?.revenue_probability ?? null,
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
