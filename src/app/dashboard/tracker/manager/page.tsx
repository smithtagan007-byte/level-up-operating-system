import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatZAR } from '@/lib/format'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default async function ManagerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    redirect('/dashboard/tracker/recruiter')
  }

  const currentWeek = getWeekStart(new Date())
  const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: users },
    { data: staleTrackers },
    { data: pendingReviews },
    { data: coApproved },
    { data: submittedCandidates },
    { data: thisWeekDelivery },
    { data: thisWeekSales },
    { data: highRiskSubmitted },
    { data: selfReviews },
    { data: roleRevenues },
    { data: roleTrackerLinks },
    { data: overdueFollowUpsAll },
  ] = await Promise.all([
    supabase.from('user_profiles')
      .select('id, full_name, role')
      .in('role', ['talent_specialist', 'talent_manager'])
      .order('full_name'),

    supabase.from('role_tracker')
      .select('role_id, updated_at, next_action, next_action_date, delivery_recruiter_id, roles(title, status, clients(name))')
      .lt('updated_at', staleThreshold),

    supabase.from('internal_reviews')
      .select('id, created_at, candidates(full_name, roles(title, clients(name)))')
      .eq('final_status', 'pending')
      .order('created_at', { ascending: true }),

    supabase.from('candidates')
      .select('id, full_name, roles(title, clients(name))')
      .eq('client_owner_approved', true)
      .eq('submitted_to_client', false),

    supabase.from('candidates')
      .select('id, full_name, created_at, roles(title, clients(name))')
      .eq('submitted_to_client', true)
      .order('created_at', { ascending: false }),

    supabase.from('weekly_role_data')
      .select('user_id, cvs, first_interviews, second_interviews, assessments, offers, starts, revenue')
      .eq('week_start', currentWeek),

    supabase.from('sales_tracker')
      .select('user_id, calls_made, follow_ups, new_clients, new_roles')
      .eq('week_start', currentWeek),

    supabase.from('candidates')
      .select('id, full_name, risk_level, roles(title, clients(name))')
      .eq('submitted_to_client', true)
      .in('risk_level', ['High', 'Critical']),

    supabase.from('weekly_self_reviews')
      .select('user_id, overall_score, reviewed, reviewed_at')
      .eq('week_start', currentWeek),

    supabase.from('role_revenue')
      .select('role_id, potential_revenue, weighted_forecast_revenue, revenue_status, roles(id, title, status)'),

    supabase.from('role_tracker')
      .select('role_id, delivery_recruiter_id'),

    supabase.from('follow_ups')
      .select('id, owner_id, follow_up_type, due_date, related_type, status')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().slice(0, 10))
      .order('due_date', { ascending: true }),
  ])

  // --- Commission data ---
  const now = new Date()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const thisCommMonth = `${monthNames[now.getMonth()]}-${String(now.getFullYear()).slice(2)}`

  const { data: commPlacements } = await supabase
    .from('placements')
    .select('staff_name, recruiter_id, commission_earned, commission_paid, payroll_advance, commission_month')
    .eq('commission_month', thisCommMonth)

  // Group by recruiter for "this month" earned
  const commByRecruiter: Record<string, { name: string; earned: number; paid: number }> = {}
  for (const p of commPlacements ?? []) {
    const key: string = (p.recruiter_id as string | null) ?? (p.staff_name as string | null) ?? 'unknown'
    const name: string = (p.staff_name as string | null) ?? key
    if (!commByRecruiter[key]) commByRecruiter[key] = { name, earned: 0, paid: 0 }
    commByRecruiter[key].earned += Number(p.commission_earned ?? 0)
    commByRecruiter[key].paid += Number(p.commission_paid ?? 0)
  }
  const commRows = Object.values(commByRecruiter).sort((a, b) => b.earned - a.earned)

  // Outstanding across all time
  const { data: allCommPlacements } = await supabase
    .from('placements')
    .select('commission_earned, commission_paid')
  const totalCommOutstanding = (allCommPlacements ?? []).reduce(
    (s: number, p: any) => s + Number(p.commission_earned ?? 0) - Number(p.commission_paid ?? 0),
    0
  )

  // Stale active roles only
  const staleActiveRoles = (staleTrackers ?? []).filter(t => {
    const role = (Array.isArray(t.roles) ? t.roles[0] : t.roles) as { status: string } | null
    return role?.status !== 'closed'
  })

  // Maps
  const userNameMap = Object.fromEntries((users ?? []).map(u => [u.id, u.full_name]))

  // Revenue risk computations
  const trackerLinkMap = Object.fromEntries((roleTrackerLinks ?? []).map(t => [t.role_id, t]))
  const staleRoleIds = new Set(staleActiveRoles.map(t => t.role_id))

  const activeRevenues = (roleRevenues ?? []).filter(r => {
    const role = (Array.isArray(r.roles) ? r.roles[0] : r.roles) as { status: string } | null
    return role?.status !== 'closed' && r.revenue_status !== 'Closed Lost'
  })
  const teamForecastTotal = activeRevenues.reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)

  // High-value stale roles: potential > 100000 AND in stale list
  const highValueStaleRevenues = activeRevenues.filter(r =>
    Number(r.potential_revenue ?? 0) > 100000 && staleRoleIds.has(r.role_id)
  )

  // Hot roles by recruiter
  const hotRevenues = activeRevenues.filter(r => r.revenue_status === 'Hot')
  interface HotRoleByRecruiter { recruiterId: string; recruiterName: string; count: number; total: number }
  const hotByRecruiter: Record<string, HotRoleByRecruiter> = {}
  for (const rev of hotRevenues) {
    const link = trackerLinkMap[rev.role_id]
    if (!link?.delivery_recruiter_id) continue
    const rid = link.delivery_recruiter_id
    if (!hotByRecruiter[rid]) {
      hotByRecruiter[rid] = { recruiterId: rid, recruiterName: userNameMap[rid] ?? rid, count: 0, total: 0 }
    }
    hotByRecruiter[rid].count += 1
    hotByRecruiter[rid].total += Number(rev.potential_revenue ?? 0)
  }
  const hotByRecruiterRows = Object.values(hotByRecruiter).sort((a, b) => b.total - a.total)

  // Missing potential revenue
  const missingPotentialRevenues = activeRevenues.filter(r => r.potential_revenue == null)

  // Weekly delivery/sales maps by user_id
  const deliveryMap = Object.fromEntries((thisWeekDelivery ?? []).map(r => [r.user_id, r]))
  const salesMap = Object.fromEntries((thisWeekSales ?? []).map(r => [r.user_id, r]))

  // Total interviews this week
  const totalInterviewsThisWeek = (thisWeekDelivery ?? []).reduce(
    (s, r) => s + (r.first_interviews ?? 0) + (r.second_interviews ?? 0), 0
  )

  // Self-review map by user_id
  const selfReviewMap = Object.fromEntries((selfReviews ?? []).map(r => [r.user_id, r]))
  const selfReviewsAwaitingManagerReview = (selfReviews ?? []).filter(r => !r.reviewed)

  // Overdue follow-ups grouped by owner
  interface OverdueByRecruiter { recruiterId: string; recruiterName: string; count: number; oldest: string }
  const overdueByRecruiter: Record<string, OverdueByRecruiter> = {}
  for (const f of overdueFollowUpsAll ?? []) {
    const oid = f.owner_id as string
    if (!overdueByRecruiter[oid]) {
      overdueByRecruiter[oid] = {
        recruiterId: oid,
        recruiterName: userNameMap[oid] ?? 'Unknown',
        count: 0,
        oldest: f.due_date as string,
      }
    }
    overdueByRecruiter[oid].count += 1
    if ((f.due_date as string) < overdueByRecruiter[oid].oldest) {
      overdueByRecruiter[oid].oldest = f.due_date as string
    }
  }
  const overdueByRecruiterRows = Object.values(overdueByRecruiter).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Delivery risk and pipeline control — W/C {new Date(currentWeek).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Headline risk indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Stale Roles', value: staleActiveRoles.length, alert: staleActiveRoles.length > 0 },
          { label: 'Pending Internal Reviews', value: (pendingReviews ?? []).length, alert: (pendingReviews ?? []).length > 0 },
          { label: 'Approved, Awaiting Submission', value: (coApproved ?? []).length, alert: (coApproved ?? []).length > 0 },
          { label: 'Interviews This Week', value: totalInterviewsThisWeek, alert: false },
        ].map(({ label, value, alert }) => (
          <div key={label} className={`bg-white border rounded-xl p-5 ${alert && value > 0 ? 'border-amber-200' : 'border-gray-200'}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-3xl font-bold ${alert && value > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Stale roles */}
      {staleActiveRoles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Roles — No Activity in 7+ Days ({staleActiveRoles.length})
          </h2>
          <div className="bg-white border border-amber-100 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Role', 'Client', 'Recruiter', 'Last Updated', 'Next Action', 'Due'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staleActiveRoles.map(t => {
                  const role = (Array.isArray(t.roles) ? t.roles[0] : t.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  const daysSinceUpdate = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 86400000)
                  return (
                    <tr key={t.role_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.delivery_recruiter_id ? (userNameMap[t.delivery_recruiter_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3 text-red-600 font-medium text-xs">{daysSinceUpdate}d ago</td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate">{t.next_action ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {t.next_action_date
                          ? new Date(t.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue Risk */}
      {(teamForecastTotal > 0 || hotByRecruiterRows.length > 0 || missingPotentialRevenues.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Team Forecast Total', value: teamForecastTotal > 0 ? formatZAR(teamForecastTotal) : '—', sub: 'Active non-lost roles', color: 'text-gray-900' },
              { label: 'Hot Roles', value: hotRevenues.length, sub: `${formatZAR(hotRevenues.reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0))} potential`, color: 'text-amber-700' },
              { label: 'High-Value Stale', value: highValueStaleRevenues.length, sub: '>R100k, no activity 7d', color: highValueStaleRevenues.length > 0 ? 'text-red-600' : 'text-gray-900' },
              { label: 'Missing Forecast', value: missingPotentialRevenues.length, sub: 'No potential revenue set', color: missingPotentialRevenues.length > 0 ? 'text-amber-600' : 'text-gray-900' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className={`bg-white border rounded-xl p-5 ${typeof value === 'number' && value > 0 && color.includes('red') ? 'border-red-100' : typeof value === 'number' && value > 0 && color.includes('amber') ? 'border-amber-100' : 'border-gray-200'}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Hot roles by recruiter */}
          {hotByRecruiterRows.length > 0 && (
            <div className="bg-white border border-amber-100 rounded-xl overflow-x-auto table-container mb-4">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hot Roles by Recruiter</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50">
                    {['Recruiter', 'Hot Roles', 'Total Potential'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hotByRecruiterRows.map(r => (
                    <tr key={r.recruiterId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.recruiterName}</td>
                      <td className="px-4 py-2.5 text-amber-700 font-semibold">{r.count}</td>
                      <td className="px-4 py-2.5 text-gray-700">{formatZAR(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* High-value stale roles */}
          {highValueStaleRevenues.length > 0 && (
            <div className="bg-white border border-red-100 rounded-xl overflow-x-auto table-container mb-4">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">High-Value Roles — Stale (No Activity 7+ Days)</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50">
                    {['Role', 'Recruiter', 'Potential Revenue', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {highValueStaleRevenues.map(r => {
                    const role = (Array.isArray(r.roles) ? r.roles[0] : r.roles) as { id: string; title: string; status: string } | null
                    const link = trackerLinkMap[r.role_id]
                    return (
                      <tr key={r.role_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{role?.title ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{link?.delivery_recruiter_id ? (userNameMap[link.delivery_recruiter_id] ?? '—') : '—'}</td>
                        <td className="px-4 py-2.5 font-semibold text-red-600">{r.potential_revenue ? formatZAR(Number(r.potential_revenue)) : '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.revenue_status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Missing potential revenue */}
          {missingPotentialRevenues.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                {missingPotentialRevenues.length} role{missingPotentialRevenues.length !== 1 ? 's' : ''} missing potential revenue
              </p>
              <p className="text-xs text-amber-600">
                Revenue forecasting is incomplete for these roles. Ask recruiters to set fee details on each role.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CVs pending internal review */}
      {(pendingReviews ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            CVs Pending Internal Review ({(pendingReviews ?? []).length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Candidate', 'Role', 'Client', 'Submitted'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(pendingReviews ?? []).map(r => {
                  const candidate = (Array.isArray(r.candidates) ? r.candidates[0] : r.candidates) as { full_name: string; roles: unknown } | null
                  const role = candidate ? ((Array.isArray((candidate as { roles: unknown }).roles) ? ((candidate as { roles: unknown[] }).roles)[0] : (candidate as { roles: unknown }).roles) as { title: string; clients: unknown } | null) : null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/dashboard/internal-reviews/${r.id}`} className="hover:underline">
                          {candidate?.full_name ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidates approved but not submitted */}
      {(coApproved ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Approved — Pending Client Submission ({(coApproved ?? []).length})
          </h2>
          <div className="bg-white border border-amber-100 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Candidate', 'Role', 'Client'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(coApproved ?? []).map(c => {
                  const role = (Array.isArray(c.roles) ? c.roles[0] : c.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/dashboard/candidates/${c.id}`} className="hover:underline">{c.full_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CVs awaiting client feedback */}
      {(submittedCandidates ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            CVs Awaiting Client Feedback ({(submittedCandidates ?? []).length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Candidate', 'Role', 'Client', 'Submitted'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(submittedCandidates ?? []).slice(0, 20).map(c => {
                  const role = (Array.isArray(c.roles) ? c.roles[0] : c.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/dashboard/candidates/${c.id}`} className="hover:underline">{c.full_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offers at risk (high risk candidates that are submitted) */}
      {(highRiskSubmitted ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Offers at Risk — High Counteroffer Risk ({(highRiskSubmitted ?? []).length})
          </h2>
          <div className="bg-white border border-red-100 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Candidate', 'Role', 'Client', 'Risk Level'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(highRiskSubmitted ?? []).map(c => {
                  const role = (Array.isArray(c.roles) ? c.roles[0] : c.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/dashboard/candidates/${c.id}`} className="hover:underline">{c.full_name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${c.risk_level === 'Critical' ? 'text-red-700' : 'text-orange-600'}`}>
                          {c.risk_level}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recruiter KPI table */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Recruiter KPIs — This Week
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Recruiter', 'Calls', 'New Clients', 'New Roles', 'CVs', '1st Int.', '2nd Int.', 'Assessments', 'Offers', 'Starts', 'Revenue', 'Submitted'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map(u => {
                const d = deliveryMap[u.id]
                const s = salesMap[u.id]
                const submitted = !!(d || s)
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!submitted ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/tracker/recruiter?userId=${u.id}`} className="hover:underline">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s?.calls_made ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s?.new_clients ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s?.new_roles ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d?.cvs ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d?.first_interviews ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d?.second_interviews ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d?.assessments ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{d?.offers ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{d?.starts ?? '—'}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">
                      {d?.revenue ? formatZAR(Number(d.revenue)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {submitted
                        ? <span className="text-emerald-600 text-xs font-medium">Yes</span>
                        : <span className="text-red-500 text-xs font-medium">No</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Overdue Follow-Ups by Recruiter */}
      {overdueByRecruiterRows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Overdue Follow-Ups by Recruiter ({(overdueFollowUpsAll ?? []).length} total)
          </h2>
          <div className="bg-white border border-red-100 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Recruiter', 'Overdue Count', 'Oldest Due Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overdueByRecruiterRows.map(r => (
                  <tr key={r.recruiterId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.recruiterName}</td>
                    <td className="px-4 py-3 text-red-600 font-semibold">{r.count}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">
                      {new Date(r.oldest).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/tracker/recruiter?userId=${r.recruiterId}`}
                        className="text-xs text-gray-400 hover:text-gray-900 font-medium transition-colors"
                      >
                        View dashboard →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Commission — {thisCommMonth}
          </h2>
          <div className="flex items-center gap-4">
            {totalCommOutstanding > 0 && (
              <span className="text-xs font-medium text-red-600">
                {formatZAR(totalCommOutstanding)} outstanding (all time)
              </span>
            )}
            <Link href="/dashboard/commission" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              Full module →
            </Link>
          </div>
        </div>
        {commRows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-400">No commission entries for {thisCommMonth} yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Recruiter', 'Com Earned', 'Com Paid', 'Outstanding'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commRows.map(r => {
                  const os = r.earned - r.paid
                  return (
                    <tr key={r.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-900 tabular-nums">{formatZAR(r.earned)}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{formatZAR(r.paid)}</td>
                      <td className={`px-4 py-3 tabular-nums font-medium ${os > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                        {os > 0 ? formatZAR(os) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weekly Self-Reviews */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Weekly Self-Reviews
          </h2>
          {selfReviewsAwaitingManagerReview.length > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {selfReviewsAwaitingManagerReview.length} awaiting your review
            </span>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Recruiter', 'Submitted', 'Overall Score', 'Manager Reviewed', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map(u => {
                const sr = selfReviewMap[u.id]
                const submitted = !!sr
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!submitted ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-4 py-3">
                      {submitted
                        ? <span className="text-xs font-medium text-emerald-600">Yes</span>
                        : <span className="text-xs font-medium text-red-500">No</span>}
                    </td>
                    <td className="px-4 py-3">
                      {sr?.overall_score != null
                        ? <span className="font-semibold text-gray-900">{Number(sr.overall_score).toFixed(1)}/10</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {submitted && sr.reviewed
                        ? <span className="text-xs font-medium text-blue-600">
                            Reviewed {sr.reviewed_at ? new Date(sr.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        : submitted
                        ? <span className="text-xs text-amber-600 font-medium">Pending</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {submitted && (
                        <Link
                          href={`/dashboard/recruiter/self-review?userId=${u.id}&week=${currentWeek}`}
                          className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
                        >
                          {sr.reviewed ? 'View' : 'Review →'}
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
