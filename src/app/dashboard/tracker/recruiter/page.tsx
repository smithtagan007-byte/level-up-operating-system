import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserSelector } from './UserSelector'
import { formatZAR } from '@/lib/format'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

interface Props {
  searchParams: Promise<{ userId?: string }>
}

export default async function RecruiterDashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentWeek = getWeekStart(new Date())

  const [{ data: myProfile }, { data: allRecruiters }] = await Promise.all([
    supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single(),
    supabase.from('user_profiles')
      .select('id, full_name')
      .in('role', ['talent_specialist', 'talent_manager'])
      .order('full_name'),
  ])

  const isManager = ['talent_manager', 'director'].includes(myProfile?.role ?? '')
  const viewUserId = isManager && params.userId ? params.userId : user.id
  const isViewingSelf = viewUserId === user.id

  const [{ data: roleTrackers }, { data: weekData }, { data: openFollowUps }, { data: viewedProfile }, { data: selfReview }] = await Promise.all([
    supabase.from('role_tracker')
      .select('role_id, expected_revenue, revenue_probability, next_action, next_action_date, cvs_submitted, follow_up_status, updated_at, roles(id, title, status, clients(name))')
      .eq('delivery_recruiter_id', viewUserId),
    supabase.from('weekly_role_data')
      .select('cvs, first_interviews, second_interviews, assessments, offers, starts, revenue, cost')
      .eq('user_id', viewUserId)
      .eq('week_start', currentWeek)
      .maybeSingle(),
    supabase.from('follow_ups')
      .select('id, follow_up_type, due_date, notes, related_type, status')
      .eq('owner_id', viewUserId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(8),
    isViewingSelf
      ? Promise.resolve({ data: myProfile?.full_name ?? '' })
      : supabase.from('user_profiles').select('full_name').eq('id', viewUserId).single().then(r => ({ data: r.data?.full_name ?? null })),
    supabase.from('weekly_self_reviews')
      .select('overall_score, reviewed, reviewed_at, manager_comments')
      .eq('user_id', viewUserId)
      .eq('week_start', currentWeek)
      .maybeSingle(),
  ])

  const roleIds = (roleTrackers ?? []).map(t => t.role_id)

  const { data: roleRevenues } = roleIds.length > 0
    ? await supabase.from('role_revenue')
      .select('role_id, potential_revenue, weighted_forecast_revenue, actual_revenue, revenue_variance, revenue_status')
      .in('role_id', roleIds)
    : { data: [] as { role_id: string; potential_revenue: number | null; weighted_forecast_revenue: number | null; actual_revenue: number | null; revenue_variance: number | null; revenue_status: string }[] }

  const { data: candidates } = roleIds.length > 0
    ? await supabase.from('candidates')
      .select('id, full_name, submitted_to_client, client_owner_approved, role_id')
      .in('role_id', roleIds)
    : { data: [] as { id: string; full_name: string; submitted_to_client: boolean; client_owner_approved: boolean; role_id: string }[] }

  const candidateIds = (candidates ?? []).map(c => c.id)

  const { data: pendingReviews } = candidateIds.length > 0
    ? await supabase.from('internal_reviews')
      .select('id, final_status, created_at, candidates(full_name, role_id)')
      .in('candidate_id', candidateIds)
      .eq('final_status', 'pending')
    : { data: [] as { id: string; final_status: string; created_at: string; candidates: { full_name: string; role_id: string } | null }[] }

  // Compute derived data
  const activeRoles = (roleTrackers ?? []).filter(t => {
    const role = (Array.isArray(t.roles) ? t.roles[0] : t.roles) as { status: string } | null
    return role?.status !== 'closed'
  })

  const hotRoles = activeRoles.filter(t => (t.revenue_probability ?? 0) >= 60)

  const forecastTotal = activeRoles.reduce((s, t) => s + (t.expected_revenue ?? 0), 0)
  const weightedForecast = activeRoles.reduce((s, t) => {
    if (!t.expected_revenue || !t.revenue_probability) return s
    return s + (t.expected_revenue * t.revenue_probability) / 100
  }, 0)

  // Structured revenue from role_revenue
  const structuredPotential = (roleRevenues ?? [])
    .filter(r => !['Closed Lost'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)
  const structuredWeighted = (roleRevenues ?? [])
    .filter(r => !['Closed Lost'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.weighted_forecast_revenue ?? 0), 0)
  const structuredHotRevenue = (roleRevenues ?? [])
    .filter(r => r.revenue_status === 'Hot')
    .reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)
  const structuredActual = (roleRevenues ?? [])
    .filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.actual_revenue ?? 0), 0)
  const structuredVariance = (roleRevenues ?? [])
    .filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status))
    .reduce((s, r) => s + Number(r.revenue_variance ?? 0), 0)
  const hasStructuredRevenue = (roleRevenues ?? []).length > 0

  const submittedCandidates = (candidates ?? []).filter(c => c.submitted_to_client)
  const coApprovedNotSubmitted = (candidates ?? []).filter(c => c.client_owner_approved && !c.submitted_to_client)

  const w = weekData
  const totalInterviews = (w?.first_interviews ?? 0) + (w?.second_interviews ?? 0)
  const hasSubmittedWeek = !!weekData

  const displayName = (viewedProfile?.data as string | null) ?? 'Recruiter'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isViewingSelf ? 'My Dashboard' : `${displayName}'s Dashboard`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            W/C {new Date(currentWeek).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {!hasSubmittedWeek && isViewingSelf && (
              <span className="ml-2 text-amber-600 font-medium">— weekly entry not submitted</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isManager && (allRecruiters ?? []).length > 0 && (
            <UserSelector
              users={allRecruiters ?? []}
              selectedId={viewUserId}
            />
          )}
          {isViewingSelf && (
            <Link
              href="/dashboard/tracker/weekly"
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                hasSubmittedWeek
                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'bg-gray-900 text-white hover:bg-gray-800 border-transparent'
              }`}
            >
              {hasSubmittedWeek ? 'Edit Weekly Entry' : 'Submit Weekly Entry'}
            </Link>
          )}
        </div>
      </div>

      {/* This week metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CVs Submitted', value: w?.cvs ?? 0 },
          { label: 'Interviews', value: totalInterviews },
          { label: 'Offers', value: w?.offers ?? 0 },
          { label: 'Starts', value: w?.starts ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-3xl font-bold ${hasSubmittedWeek ? 'text-gray-900' : 'text-gray-300'}`}>{value}</p>
            {!hasSubmittedWeek && <p className="text-xs text-gray-400 mt-1">Not submitted</p>}
          </div>
        ))}
      </div>

      {/* Interview breakdown */}
      {hasSubmittedWeek && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Interview Breakdown — This Week</h2>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">1st Interviews</p>
              <p className="text-2xl font-bold text-gray-900">{w?.first_interviews ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">2nd Interviews</p>
              <p className="text-2xl font-bold text-gray-900">{w?.second_interviews ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Assessments</p>
              <p className="text-2xl font-bold text-gray-900">{w?.assessments ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Offers Declined</p>
              <p className="text-2xl font-bold text-gray-900">{(w as { offers_declined?: number } | null)?.offers_declined ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Forecast</p>
          <p className="text-2xl font-bold text-gray-900">
            {forecastTotal > 0 ? formatZAR(forecastTotal) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Expected revenue across {activeRoles.length} active role{activeRoles.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Weighted Forecast</p>
          <p className="text-2xl font-bold text-emerald-600">
            {weightedForecast > 0 ? formatZAR(Math.round(weightedForecast)) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Probability-adjusted</p>
        </div>
      </div>

      {/* Structured Revenue (from role_revenue module) */}
      {hasStructuredRevenue && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue Forecast</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pipeline Potential', value: structuredPotential > 0 ? formatZAR(structuredPotential) : '—', sub: 'Active roles', color: 'text-gray-900' },
              { label: 'Weighted Forecast', value: structuredWeighted > 0 ? formatZAR(Math.round(structuredWeighted)) : '—', sub: 'Probability-adjusted', color: 'text-blue-600' },
              { label: 'Hot Role Revenue', value: structuredHotRevenue > 0 ? formatZAR(structuredHotRevenue) : '—', sub: 'Status = Hot', color: 'text-amber-700' },
              { label: 'Actual (Placed)', value: structuredActual > 0 ? formatZAR(structuredActual) : '—', sub: 'Placed/Invoiced/Paid', color: 'text-emerald-600' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>
          {structuredVariance !== 0 && structuredActual > 0 && (
            <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Variance on placed roles (actual vs potential)</span>
              <span className={`font-semibold text-sm ${structuredVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {structuredVariance >= 0 ? '+' : ''}{formatZAR(structuredVariance)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Active roles */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Active Roles ({activeRoles.length})
        </h2>
        {activeRoles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No active roles assigned</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Role', 'Client', 'CVs', 'Probability', 'Next Action', 'Due'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRoles.map(t => {
                  const role = (Array.isArray(t.roles) ? t.roles[0] : t.roles) as { id: string; title: string; status: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  const prob = t.revenue_probability
                  return (
                    <tr key={t.role_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{t.cvs_submitted}</td>
                      <td className="px-4 py-3">
                        {prob != null
                          ? <span className={`font-medium ${prob >= 70 ? 'text-emerald-600' : prob >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>{prob}%</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
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
        )}
      </div>

      {/* Hot roles */}
      {hotRoles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Hot Roles — Likely to Close
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Role', 'Client', 'Probability', 'Expected Value', 'Next Action'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {hotRoles.map(t => {
                  const role = (Array.isArray(t.roles) ? t.roles[0] : t.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={t.role_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-600">{t.revenue_probability}%</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {t.expected_revenue ? formatZAR(Number(t.expected_revenue)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{t.next_action ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending work */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending internal reviews */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            CVs Pending Review ({(pendingReviews ?? []).length})
          </h3>
          {(pendingReviews ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">None pending</p>
          ) : (
            <ul className="space-y-2">
              {(pendingReviews ?? []).slice(0, 5).map(r => {
                const candidate = (Array.isArray(r.candidates) ? r.candidates[0] : r.candidates) as { full_name: string } | null
                return (
                  <li key={r.id} className="text-xs text-gray-700">
                    <Link href={`/dashboard/internal-reviews/${r.id}`} className="hover:text-gray-900 hover:underline">
                      {candidate?.full_name ?? '—'}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* CO approved, not yet submitted */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Approved, Not Submitted ({coApprovedNotSubmitted.length})
          </h3>
          {coApprovedNotSubmitted.length === 0 ? (
            <p className="text-xs text-gray-400">None pending</p>
          ) : (
            <ul className="space-y-2">
              {coApprovedNotSubmitted.slice(0, 5).map(c => (
                <li key={c.id} className="text-xs">
                  <Link href={`/dashboard/candidates/${c.id}`} className="text-amber-700 hover:underline font-medium">
                    {c.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CVs submitted, pending feedback */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Awaiting Client Feedback ({submittedCandidates.length})
          </h3>
          {submittedCandidates.length === 0 ? (
            <p className="text-xs text-gray-400">None pending</p>
          ) : (
            <ul className="space-y-2">
              {submittedCandidates.slice(0, 5).map(c => (
                <li key={c.id} className="text-xs">
                  <Link href={`/dashboard/candidates/${c.id}`} className="text-gray-700 hover:underline">
                    {c.full_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Weekly Self-Review card */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Weekly Self-Review</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {selfReview ? (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Submitted
                  </span>
                  {selfReview.reviewed ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Manager Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Awaiting Manager Review
                    </span>
                  )}
                </div>
                {selfReview.overall_score != null && (
                  <p className="text-sm text-gray-600">
                    Overall score: <span className="font-semibold text-gray-900">{Number(selfReview.overall_score).toFixed(1)}/10</span>
                  </p>
                )}
                {selfReview.manager_comments && (
                  <p className="text-xs text-gray-500 mt-2 max-w-md truncate">
                    Manager: "{selfReview.manager_comments}"
                  </p>
                )}
              </div>
              <Link
                href={`/dashboard/recruiter/self-review?week=${currentWeek}${!isViewingSelf ? `&userId=${viewUserId}` : ''}`}
                className="text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                View / Edit
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Not submitted this week</p>
                <p className="text-xs text-gray-400 mt-0.5">Takes under 5 minutes — 5 scores and 5 questions.</p>
              </div>
              {isViewingSelf && (
                <Link
                  href={`/dashboard/recruiter/self-review?week=${currentWeek}`}
                  className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Complete Self-Review
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Open follow-ups */}
      {(openFollowUps ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Open Follow-Ups
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Type', 'Related', 'Due', 'Notes'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(openFollowUps ?? []).map(f => {
                  const isOverdue = f.due_date < new Date().toISOString().slice(0, 10)
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-gray-700 capitalize">{f.follow_up_type}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{f.related_type}</td>
                      <td className={`px-4 py-3 font-medium text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                        {new Date(f.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {isOverdue && ' (overdue)'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{f.notes ?? '—'}</td>
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
