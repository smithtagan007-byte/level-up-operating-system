import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatZAR } from '@/lib/format'

function getFYBounds(): { fyStart: string; fyEnd: string; fyLabel: string } {
  const now = new Date()
  const fyStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return {
    fyStart: `${fyStartYear}-09-01`,
    fyEnd: `${fyStartYear + 1}-08-31`,
    fyLabel: `FY${fyStartYear}/${String(fyStartYear + 1).slice(2)}`,
  }
}

export default async function DirectorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'director') {
    redirect('/dashboard/tracker/recruiter')
  }

  const { fyStart, fyEnd, fyLabel } = getFYBounds()

  const currentWeek = (() => {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })()

  const [
    { data: users },
    { data: fyDelivery },
    { data: fySales },
    { data: roleRevenues },
    { data: roleTrackerLinks },
    { data: thisWeekSelfReviews },
  ] = await Promise.all([
    supabase.from('user_profiles').select('id, full_name, role').order('full_name'),

    supabase.from('weekly_role_data')
      .select('user_id, week_start, month, year, cvs, first_interviews, second_interviews, offers, starts, revenue, cost')
      .gte('week_start', fyStart)
      .lte('week_start', fyEnd),

    supabase.from('sales_tracker')
      .select('user_id, week_start, month, year, new_clients, new_roles, calls_made')
      .gte('week_start', fyStart)
      .lte('week_start', fyEnd),

    supabase.from('role_revenue')
      .select('role_id, potential_revenue, weighted_forecast_revenue, actual_revenue, revenue_variance, revenue_status, forecast_probability, roles(id, title, status, client_id, clients(id, name))'),

    supabase.from('role_tracker')
      .select('role_id, delivery_recruiter_id, next_action, next_action_date'),

    supabase.from('weekly_self_reviews')
      .select('user_id, overall_score, reviewed')
      .eq('week_start', currentWeek),
  ])

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u.full_name]))
  const trackerLinkMap = Object.fromEntries((roleTrackerLinks ?? []).map(t => [t.role_id, t]))

  // --- Self-review summary (current week) ---
  const recruiterCount = (users ?? []).filter(u => ['talent_specialist', 'talent_manager'].includes(u.role)).length
  const selfReviewSubmitted = (thisWeekSelfReviews ?? []).length
  const selfReviewCompletionPct = recruiterCount > 0 ? Math.round((selfReviewSubmitted / recruiterCount) * 100) : 0
  const avgTeamScore = selfReviewSubmitted > 0
    ? (thisWeekSelfReviews ?? []).reduce((s, r) => s + Number(r.overall_score ?? 0), 0) / selfReviewSubmitted
    : null

  // --- YTD revenue metrics (from weekly_role_data - temporal) ---
  const ytdRevenue = (fyDelivery ?? []).reduce((s, r) => s + Number(r.revenue ?? 0), 0)
  const ytdCost = (fyDelivery ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0)
  const ytdNet = ytdRevenue - ytdCost
  const ytdStarts = (fyDelivery ?? []).reduce((s, r) => s + (r.starts ?? 0), 0)
  const ytdOffers = (fyDelivery ?? []).reduce((s, r) => s + (r.offers ?? 0), 0)
  const ytdCvs = (fyDelivery ?? []).reduce((s, r) => s + (r.cvs ?? 0), 0)
  const ytdInterviews = (fyDelivery ?? []).reduce((s, r) => s + (r.first_interviews ?? 0) + (r.second_interviews ?? 0), 0)

  // --- Forecast from role_revenue ---
  const activeRevenues = (roleRevenues ?? []).filter(r => {
    const role = (Array.isArray(r.roles) ? r.roles[0] : r.roles) as { status: string } | null
    return role?.status !== 'closed' && r.revenue_status !== 'Closed Lost'
  })

  const forecastTotal = activeRevenues.reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)
  const weightedForecast = activeRevenues.reduce((s, r) => s + Number(r.weighted_forecast_revenue ?? 0), 0)
  const actualYTD = (roleRevenues ?? [])
    .filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.actual_revenue ?? 0), 0)
  const hotRevenue = (roleRevenues ?? [])
    .filter(r => r.revenue_status === 'Hot')
    .reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)
  const varianceTotal = (roleRevenues ?? [])
    .filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.revenue_variance ?? 0), 0)

  // --- Month-on-month revenue (last 6 months) ---
  const monthlyRevenue: Record<string, number> = {}
  for (const r of fyDelivery ?? []) {
    if (!r.month || !r.year) continue
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    monthlyRevenue[key] = (monthlyRevenue[key] ?? 0) + Number(r.revenue ?? 0)
  }
  const monthKeys = Object.keys(monthlyRevenue).sort().slice(-6)

  // --- Revenue by recruiter (FY, using role_revenue + role_tracker) ---
  const recruiterRevenue: Record<string, { name: string; revenue: number; forecast: number; starts: number; offers: number; cvs: number; actual: number }> = {}
  for (const u of users ?? []) {
    if (!['talent_specialist', 'talent_manager'].includes(u.role)) continue
    recruiterRevenue[u.id] = { name: u.full_name, revenue: 0, forecast: 0, starts: 0, offers: 0, cvs: 0, actual: 0 }
  }
  for (const r of fyDelivery ?? []) {
    if (!recruiterRevenue[r.user_id]) continue
    recruiterRevenue[r.user_id].revenue += Number(r.revenue ?? 0)
    recruiterRevenue[r.user_id].starts += r.starts ?? 0
    recruiterRevenue[r.user_id].offers += r.offers ?? 0
    recruiterRevenue[r.user_id].cvs += r.cvs ?? 0
  }
  // Add structured forecast and actual from role_revenue (via role_tracker link)
  for (const rev of activeRevenues) {
    const link = trackerLinkMap[rev.role_id]
    if (!link?.delivery_recruiter_id || !recruiterRevenue[link.delivery_recruiter_id]) continue
    recruiterRevenue[link.delivery_recruiter_id].forecast += Number(rev.potential_revenue ?? 0)
  }
  for (const rev of roleRevenues ?? []) {
    if (!['Placed', 'Invoiced', 'Paid'].includes(rev.revenue_status)) continue
    const link = trackerLinkMap[rev.role_id]
    if (!link?.delivery_recruiter_id || !recruiterRevenue[link.delivery_recruiter_id]) continue
    recruiterRevenue[link.delivery_recruiter_id].actual += Number(rev.actual_revenue ?? 0)
  }
  const recruiterRows = Object.values(recruiterRevenue).sort((a, b) => b.revenue - a.revenue)

  // --- Revenue by client (from role_revenue joined to clients) ---
  const clientRevenue: Record<string, { name: string; placements: number; revenue: number; forecast: number }> = {}
  for (const rev of roleRevenues ?? []) {
    const role = (Array.isArray(rev.roles) ? rev.roles[0] : rev.roles) as { client_id: string; clients: unknown } | null
    if (!role) continue
    const client = (Array.isArray(role.clients) ? (role.clients as { id: string; name: string }[])[0] : role.clients) as { id: string; name: string } | null
    if (!client) continue
    if (!clientRevenue[client.id]) {
      clientRevenue[client.id] = { name: client.name, placements: 0, revenue: 0, forecast: 0 }
    }
    const actual = Number(rev.actual_revenue ?? 0)
    if (actual > 0 && ['Placed', 'Invoiced', 'Paid'].includes(rev.revenue_status)) {
      clientRevenue[client.id].placements += 1
      clientRevenue[client.id].revenue += actual
    }
    if (!['Closed Lost', 'Placed', 'Invoiced', 'Paid'].includes(rev.revenue_status)) {
      clientRevenue[client.id].forecast += Number(rev.potential_revenue ?? 0)
    }
  }
  const clientRows = Object.values(clientRevenue)
    .filter(c => c.revenue > 0 || c.forecast > 0)
    .sort((a, b) => b.revenue - a.revenue)

  // --- Hot roles (revenue_status = 'Hot' or forecast_probability >= 0.60) ---
  const hotRoles = (roleRevenues ?? []).filter(r => {
    const role = (Array.isArray(r.roles) ? r.roles[0] : r.roles) as { status: string } | null
    if (role?.status === 'closed') return false
    return r.revenue_status === 'Hot' || (r.forecast_probability != null && r.forecast_probability >= 0.60)
  })

  // --- High-confidence pipeline (75%+) ---
  const highConfRevenues = activeRevenues.filter(r => (r.forecast_probability ?? 0) >= 0.75)
  const highConfTotal = highConfRevenues.reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)

  // --- Conversion ratios ---
  const cvToInterview = ytdCvs > 0 ? ((ytdInterviews / ytdCvs) * 100).toFixed(1) : null
  const interviewToOffer = ytdInterviews > 0 ? ((ytdOffers / ytdInterviews) * 100).toFixed(1) : null
  const offerToStart = ytdOffers > 0 ? ((ytdStarts / ytdOffers) * 100).toFixed(1) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Director Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{fyLabel} — Revenue and commercial overview</p>
      </div>

      {/* YTD Revenue summary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Year to Date</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Actual Revenue (Logged)', value: formatZAR(ytdRevenue), sub: 'From weekly data', color: 'text-emerald-600' },
            { label: 'Net Revenue', value: formatZAR(ytdNet), sub: 'After costs', color: ytdNet >= 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Pipeline Forecast', value: forecastTotal > 0 ? formatZAR(forecastTotal) : '—', sub: 'Active potential revenue', color: 'text-gray-900' },
            { label: 'Weighted Forecast', value: weightedForecast > 0 ? formatZAR(Math.round(weightedForecast)) : '—', sub: 'Probability-adjusted', color: 'text-blue-600' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional revenue metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Actual (Placed/Invoiced)', value: actualYTD > 0 ? formatZAR(actualYTD) : '—', sub: 'From role_revenue', color: 'text-emerald-700' },
          { label: 'Hot Role Revenue', value: hotRevenue > 0 ? formatZAR(hotRevenue) : '—', sub: `${(roleRevenues ?? []).filter(r => r.revenue_status === 'Hot').length} hot roles`, color: 'text-amber-700' },
          { label: 'Variance (Placed)', value: varianceTotal !== 0 ? `${varianceTotal >= 0 ? '+' : ''}${formatZAR(varianceTotal)}` : '—', sub: 'Actual vs potential', color: varianceTotal >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'High-Conf Pipeline', value: highConfTotal > 0 ? formatZAR(highConfTotal) : '—', sub: `${highConfRevenues.length} roles at 75%+`, color: 'text-blue-700' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Self-review summary */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Team Self-Review — This Week
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Completion</p>
            <p className={`text-3xl font-bold ${selfReviewCompletionPct === 100 ? 'text-emerald-600' : selfReviewCompletionPct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
              {selfReviewCompletionPct}%
            </p>
            <p className="text-xs text-gray-400 mt-1">{selfReviewSubmitted} of {recruiterCount} recruiter{recruiterCount !== 1 ? 's' : ''} submitted</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Average Team Score</p>
            <p className={`text-3xl font-bold ${avgTeamScore == null ? 'text-gray-300' : avgTeamScore >= 7 ? 'text-emerald-600' : avgTeamScore >= 5 ? 'text-yellow-600' : 'text-red-500'}`}>
              {avgTeamScore != null ? `${avgTeamScore.toFixed(1)}/10` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{selfReviewSubmitted > 0 ? `Based on ${selfReviewSubmitted} submission${selfReviewSubmitted !== 1 ? 's' : ''}` : 'No submissions yet'}</p>
          </div>
        </div>
      </div>

      {/* Delivery metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CVs Submitted', value: ytdCvs },
          { label: 'Interviews', value: ytdInterviews },
          { label: 'Offers', value: ytdOffers },
          { label: 'Starts', value: ytdStarts },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Conversion ratios */}
      {(cvToInterview || interviewToOffer || offerToStart) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Conversion Ratios ({fyLabel})</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'CV → Interview', value: cvToInterview ? `${cvToInterview}%` : '—' },
              { label: 'Interview → Offer', value: interviewToOffer ? `${interviewToOffer}%` : '—' },
              { label: 'Offer → Start', value: offerToStart ? `${offerToStart}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month-on-month revenue trend */}
      {monthKeys.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Monthly Revenue Trend</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {monthKeys.map(key => (
                    <th key={key} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {new Date(key + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {monthKeys.map(key => {
                    const val = monthlyRevenue[key] ?? 0
                    const prevKey = monthKeys[monthKeys.indexOf(key) - 1]
                    const prevVal = prevKey ? (monthlyRevenue[prevKey] ?? 0) : null
                    const trend = prevVal !== null ? (val > prevVal ? 'up' : val < prevVal ? 'down' : 'flat') : null
                    return (
                      <td key={key} className="px-4 py-4 text-center">
                        <span className={`text-sm font-bold ${val > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {val > 0 ? formatZAR(val) : '—'}
                        </span>
                        {trend && val > 0 && (
                          <span className={`ml-1 text-xs ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue by recruiter */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue by Recruiter ({fyLabel})</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Recruiter', 'CVs', 'Offers', 'Starts', 'YTD Revenue', 'Open Forecast', 'Actual (Placed)'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recruiterRows.map(r => (
                <tr key={r.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.cvs}</td>
                  <td className="px-4 py-3 text-gray-600">{r.offers}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.starts}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    {r.revenue > 0 ? formatZAR(r.revenue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-blue-600">
                    {r.forecast > 0 ? formatZAR(r.forecast) : '—'}
                  </td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">
                    {r.actual > 0 ? formatZAR(r.actual) : '—'}
                  </td>
                </tr>
              ))}
              {recruiterRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by client */}
      {clientRows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue by Client</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Client', 'Placements', 'Actual Revenue', 'Open Forecast'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientRows.map(c => (
                  <tr key={c.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.placements}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {c.revenue > 0 ? formatZAR(c.revenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-blue-600">
                      {c.forecast > 0 ? formatZAR(c.forecast) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hot roles */}
      {hotRoles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Hot Roles — Likely to Close ({hotRoles.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Role', 'Client', 'Recruiter', 'Status', 'Probability', 'Potential Value', 'Next Action', 'Due'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hotRoles.map(rev => {
                  const role = (Array.isArray(rev.roles) ? rev.roles[0] : rev.roles) as { id: string; title: string; status: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  const link = trackerLinkMap[rev.role_id]
                  const probPct = rev.forecast_probability != null ? Math.round(rev.forecast_probability * 100) : null
                  return (
                    <tr key={rev.role_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{link?.delivery_recruiter_id ? (userMap[link.delivery_recruiter_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          rev.revenue_status === 'Hot' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                        }`}>{rev.revenue_status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {probPct != null
                          ? <span className={`font-semibold ${probPct >= 75 ? 'text-emerald-600' : 'text-yellow-600'}`}>{probPct}%</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {rev.potential_revenue ? formatZAR(Number(rev.potential_revenue)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate">{link?.next_action ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {link?.next_action_date
                          ? new Date(link.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High-confidence pipeline (75%+) */}
      {highConfRevenues.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            High-Confidence Pipeline — ≥75% ({highConfRevenues.length} roles · {formatZAR(highConfTotal)} potential)
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Role', 'Client', 'Recruiter', 'Probability', 'Potential Value', 'Weighted Value'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {highConfRevenues.map(rev => {
                  const role = (Array.isArray(rev.roles) ? rev.roles[0] : rev.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  const link = trackerLinkMap[rev.role_id]
                  const probPct = rev.forecast_probability != null ? Math.round(rev.forecast_probability * 100) : null
                  return (
                    <tr key={rev.role_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{link?.delivery_recruiter_id ? (userMap[link.delivery_recruiter_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">{probPct != null ? `${probPct}%` : '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {rev.potential_revenue ? formatZAR(Number(rev.potential_revenue)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-blue-600">
                        {rev.weighted_forecast_revenue ? formatZAR(Number(rev.weighted_forecast_revenue)) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
