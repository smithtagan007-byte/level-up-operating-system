import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UserSelector } from './tracker/recruiter/UserSelector'
import { CompleteFollowUpButton } from './tracker/recruiter/CompleteFollowUpButton'
import { DismissActionItemButton } from './DismissActionItemButton'
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

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentWeek = getWeekStart(new Date())
  const today = new Date().toISOString().slice(0, 10)

  // Batch 1: profile + recruiter list
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

  // Batch 2: role_team, week data, follow-ups, viewed name, self-review, my candidates, action items
  type MyCandidateRow = { id: string; full_name: string; submitted_to_client: boolean; role_id: string; roles: unknown }
  type ActionItemRow = {
    id: string; type: string; title: string; description: string | null
    priority: string; due_at: string | null
    related_entity_type: string | null; related_entity_id: string | null
  }

  const [
    { data: myTeamRoles },
    { data: weekData },
    { data: openFollowUps },
    viewedNameResult,
    { data: selfReview },
    { data: myCandidates },
    { data: rawActionItems },
  ] = await Promise.all([
    supabase.from('role_team')
      .select('role_id, role_on_role')
      .eq('user_id', viewUserId)
      .eq('is_active', true),
    supabase.from('weekly_role_data')
      .select('cvs, first_interviews, second_interviews, assessments, offers, starts, revenue, cost')
      .eq('user_id', viewUserId)
      .eq('week_start', currentWeek)
      .maybeSingle(),
    supabase.from('follow_ups')
      .select('id, follow_up_type, due_date, notes, related_type, status')
      .eq('owner_id', viewUserId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true }),
    isViewingSelf
      ? Promise.resolve({ data: myProfile?.full_name ?? '' })
      : supabase.from('user_profiles').select('full_name').eq('id', viewUserId).single().then(r => ({ data: r.data?.full_name ?? null })),
    supabase.from('weekly_self_reviews')
      .select('overall_score, reviewed, reviewed_at, manager_comments')
      .eq('user_id', viewUserId)
      .eq('week_start', currentWeek)
      .maybeSingle(),
    supabase.from('candidates')
      .select('id, full_name, submitted_to_client, role_id, roles(title, clients(name))')
      .eq('assigned_to', viewUserId)
      .order('full_name'),
    supabase.from('action_items')
      .select('id, type, title, description, priority, due_at, related_entity_type, related_entity_id')
      .eq('owner_id', viewUserId)
      .is('resolved_at', null)
      .is('dismissed_at', null)
      .order('due_at', { ascending: true }),
  ])

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const openActionItems = ([...(rawActionItems ?? [])] as ActionItemRow[]).sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 1
    const pb = priorityOrder[b.priority] ?? 1
    return pa !== pb ? pa - pb : 0
  })

  const myRoleIds = (myTeamRoles ?? []).map(r => r.role_id)
  const myRoleOnRoleMap: Record<string, string> = Object.fromEntries(
    (myTeamRoles ?? []).map(r => [r.role_id, r.role_on_role])
  )

  // Batch 3: role trackers + teammates (needs myRoleIds)
  type RoleTrackerRow = { role_id: string; expected_revenue: number | null; revenue_probability: number | null; next_action: string | null; next_action_date: string | null; cvs_submitted: number; follow_up_status: string; updated_at: string; roles: unknown }
  type TeamRow = { role_id: string; user_id: string; role_on_role: string }

  const [{ data: roleTrackers }, { data: allTeamRows }] = await Promise.all([
    myRoleIds.length > 0
      ? supabase.from('role_tracker')
          .select('role_id, expected_revenue, revenue_probability, next_action, next_action_date, cvs_submitted, follow_up_status, updated_at, roles(id, title, status, clients(name))')
          .in('role_id', myRoleIds)
      : Promise.resolve({ data: [] as RoleTrackerRow[], error: null }),
    myRoleIds.length > 0
      ? supabase.from('role_team')
          .select('role_id, user_id, role_on_role')
          .in('role_id', myRoleIds)
          .eq('is_active', true)
          .neq('user_id', viewUserId)
      : Promise.resolve({ data: [] as TeamRow[], error: null }),
  ])

  const userNameMap = Object.fromEntries((allRecruiters ?? []).map(u => [u.id, u.full_name]))
  const teammatesMap: Record<string, string[]> = {}
  for (const row of (allTeamRows ?? []) as TeamRow[]) {
    if (!teammatesMap[row.role_id]) teammatesMap[row.role_id] = []
    teammatesMap[row.role_id].push(userNameMap[row.user_id] ?? 'Unknown')
  }

  const roleIds = ((roleTrackers as RoleTrackerRow[]) ?? []).map(t => t.role_id)
  const myCandidateIds = (myCandidates ?? []).map(c => c.id)

  // Batch 4: revenues, candidates on roles, review pipeline data
  const [
    { data: roleRevenues },
    { data: roleCandidates },
    { data: pendingReviews },
    { data: candidateReviews },
    { data: candidateScreenings },
    { data: allCandidateIRs },
    pendingTMReviewsResult,
  ] = await Promise.all([
    roleIds.length > 0
      ? supabase.from('role_revenue')
          .select('role_id, potential_revenue, weighted_forecast_revenue, actual_revenue, revenue_variance, revenue_status')
          .in('role_id', roleIds)
      : Promise.resolve({ data: [] as { role_id: string; potential_revenue: number | null; weighted_forecast_revenue: number | null; actual_revenue: number | null; revenue_variance: number | null; revenue_status: string }[], error: null }),
    roleIds.length > 0
      ? supabase.from('candidates')
          .select('id, full_name, submitted_to_client, client_owner_approved, role_id')
          .in('role_id', roleIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; submitted_to_client: boolean; client_owner_approved: boolean; role_id: string }[], error: null }),
    myCandidateIds.length > 0
      ? supabase.from('internal_reviews')
          .select('id, final_status, created_at, candidates(full_name, role_id)')
          .in('candidate_id', myCandidateIds)
          .eq('final_status', 'pending')
      : Promise.resolve({ data: [] as { id: string; final_status: string; created_at: string; candidates: { full_name: string; role_id: string } | null }[], error: null }),
    myCandidateIds.length > 0
      ? supabase.from('candidate_reviews').select('candidate_id').in('candidate_id', myCandidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[], error: null }),
    myCandidateIds.length > 0
      ? supabase.from('candidate_screenings').select('candidate_id').in('candidate_id', myCandidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[], error: null }),
    myCandidateIds.length > 0
      ? supabase.from('internal_reviews')
          .select('id, candidate_id, final_status, talent_manager_status, client_owner_status')
          .in('candidate_id', myCandidateIds)
      : Promise.resolve({ data: [] as { id: string; candidate_id: string; final_status: string; talent_manager_status: string; client_owner_status: string }[], error: null }),
    isManager && isViewingSelf
      ? supabase.from('internal_reviews')
          .select('id, candidate_id, final_status, candidates(full_name, roles(title, clients(name)))')
          .eq('talent_manager_status', 'pending')
          .limit(10)
      : Promise.resolve({ data: null }),
  ])

  // Derived data
  const activeRoles = ((roleTrackers as RoleTrackerRow[]) ?? []).filter(t => {
    const role = (Array.isArray(t.roles) ? (t.roles as { status: string }[])[0] : t.roles) as { status: string } | null
    return role?.status !== 'closed'
  })

  const hotRoles = activeRoles.filter(t => (t.revenue_probability ?? 0) >= 60)

  const forecastTotal = activeRoles.reduce((s, t) => s + (t.expected_revenue ?? 0), 0)
  const weightedForecast = activeRoles.reduce((s, t) => {
    if (!t.expected_revenue || !t.revenue_probability) return s
    return s + (t.expected_revenue * t.revenue_probability) / 100
  }, 0)

  const structuredPotential = (roleRevenues ?? []).filter(r => r.revenue_status !== 'Closed Lost').reduce((s, r) => s + Number(r.potential_revenue ?? 0), 0)
  const structuredWeighted = (roleRevenues ?? []).filter(r => r.revenue_status !== 'Closed Lost').reduce((s, r) => s + Number(r.weighted_forecast_revenue ?? 0), 0)
  const structuredActual = (roleRevenues ?? []).filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status)).reduce((s, r) => s + Number(r.actual_revenue ?? 0), 0)
  const structuredVariance = (roleRevenues ?? []).filter(r => ['Placed', 'Invoiced', 'Paid'].includes(r.revenue_status)).reduce((s, r) => s + Number(r.revenue_variance ?? 0), 0)
  const hasStructuredRevenue = (roleRevenues ?? []).length > 0

  const submittedCandidates = (roleCandidates ?? []).filter(c => c.submitted_to_client)
  const coApprovedNotSubmitted = (roleCandidates ?? []).filter(c => c.client_owner_approved && !c.submitted_to_client)

  const reviewedSet = new Set((candidateReviews ?? []).map(r => r.candidate_id))
  const screenedSet = new Set((candidateScreenings ?? []).map(s => s.candidate_id))
  type IREntry = { id: string; final_status: string; talent_manager_status: string; client_owner_status: string }
  const irMap: Record<string, IREntry> = Object.fromEntries((allCandidateIRs ?? []).map(r => [r.candidate_id, r]))

  function getCandidateAction(candidateId: string, submittedToClient: boolean) {
    if (submittedToClient) return { label: 'Submitted ✓', style: 'text-emerald-600', priority: 5 }
    const ir = irMap[candidateId]
    if (ir) {
      if (ir.final_status === 'approved_for_formatting') return { label: 'Submit to client →', style: 'text-amber-700 font-semibold', priority: 1 }
      if (ir.final_status === 'rework') return { label: 'Rework required', style: 'text-orange-600 font-semibold', priority: 2 }
      if (ir.final_status === 'rejected') return { label: 'Rejected', style: 'text-red-400', priority: 6 }
      const awaitingTm = ir.talent_manager_status === 'pending'
      const awaitingCo = ir.client_owner_status === 'pending'
      if (awaitingTm && awaitingCo) return { label: 'Awaiting both decisions', style: 'text-gray-400', priority: 4 }
      if (awaitingTm) return { label: 'Awaiting TM decision', style: 'text-gray-400', priority: 4 }
      if (awaitingCo) return { label: 'Awaiting CO decision', style: 'text-gray-400', priority: 4 }
      return { label: 'In review', style: 'text-gray-400', priority: 4 }
    }
    const hasReview = reviewedSet.has(candidateId)
    const hasScreening = screenedSet.has(candidateId)
    if (hasReview && hasScreening) return { label: 'Submit for review →', style: 'text-blue-600 font-semibold', priority: 1 }
    if (!hasReview) return { label: 'Complete scorecard', style: 'text-amber-600', priority: 2 }
    return { label: 'Complete screening', style: 'text-amber-600', priority: 3 }
  }

  const sortedCandidates = [...(myCandidates ?? [])].sort((a, b) =>
    getCandidateAction(a.id, a.submitted_to_client).priority - getCandidateAction(b.id, b.submitted_to_client).priority
  )

  const w = weekData
  const totalInterviews = (w?.first_interviews ?? 0) + (w?.second_interviews ?? 0)
  const hasSubmittedWeek = !!weekData

  const displayName = (viewedNameResult?.data as string | null) ?? 'Recruiter'
  const allFollowUps = openFollowUps ?? []
  const overdueFollowUps = allFollowUps.filter(f => f.due_date < today)
  const todayFollowUps = allFollowUps.filter(f => f.due_date === today)
  const upcomingFollowUps = allFollowUps.filter(f => f.due_date > today)

  const pendingTMReviews = ((pendingTMReviewsResult?.data ?? []) as unknown[]) as {
    id: string; candidate_id: string; final_status: string;
    candidates: { full_name: string; roles: unknown } | null
  }[]

  function formatDue(due: string) {
    return new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  type FollowUp = { id: string; follow_up_type: string; due_date: string; notes: string | null; related_type: string; status: string }

  function FollowUpRow({ f, overdue }: { f: FollowUp; overdue?: boolean }) {
    return (
      <div className={`flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0`}>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${overdue ? 'text-red-700' : 'text-gray-800'}`}>{f.follow_up_type}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{f.related_type}</p>
          {f.notes && <p className="text-xs text-gray-500 mt-1">{f.notes}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>{formatDue(f.due_date)}</span>
          <CompleteFollowUpButton followUpId={f.id} />
        </div>
      </div>
    )
  }

  // Stat cards (individual-scoped)
  const statCards = [
    { label: 'Active Roles', value: activeRoles.length, href: '/dashboard/tracker/roles' },
    { label: 'My Candidates', value: sortedCandidates.length, href: '/dashboard/candidates' },
    { label: 'Open Follow-Ups', value: allFollowUps.length, href: '/dashboard/tracker/follow-ups', highlight: overdueFollowUps.length > 0 },
    { label: isManager && isViewingSelf ? 'Pending TM Reviews' : 'CVs This Week', value: isManager && isViewingSelf ? pendingTMReviews.length : (w?.cvs ?? 0), href: isManager && isViewingSelf ? '/dashboard/internal-reviews' : '/dashboard/tracker/weekly', highlight: isManager && isViewingSelf && pendingTMReviews.length > 0 },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isViewingSelf
              ? `Welcome back${myProfile?.full_name ? `, ${myProfile.full_name.split(' ')[0]}` : ''}`
              : `${displayName}'s Dashboard`}
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
            <UserSelector users={allRecruiters ?? []} selectedId={viewUserId} basePath="/dashboard" />
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

      {/* Today's Priorities */}
      {openActionItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Action Required
              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                openActionItems.some(i => i.priority === 'high')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {openActionItems.length}
              </span>
            </h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-50">
            {openActionItems.map(item => {
              const entityLink =
                item.related_entity_type === 'candidate'
                  ? `/dashboard/candidates/${item.related_entity_id}`
                  : item.related_entity_type === 'role'
                  ? `/dashboard/roles/${item.related_entity_id}`
                  : null

              const priorityDot =
                item.priority === 'high'
                  ? 'bg-red-500'
                  : item.priority === 'medium'
                  ? 'bg-amber-400'
                  : 'bg-gray-300'

              return (
                <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${priorityDot}`} />
                    <div className="min-w-0">
                      {entityLink ? (
                        <Link href={entityLink} className="text-sm font-medium text-gray-900 hover:text-gray-600 hover:underline">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {item.due_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(item.due_at) < new Date()
                          ? <span className="text-red-500 font-medium">Overdue</span>
                          : new Date(item.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        }
                      </span>
                    )}
                    {isViewingSelf && <DismissActionItemButton actionItemId={item.id} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, href, highlight }) => (
          <Link
            key={label}
            href={href}
            className={`bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow ${highlight ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
          >
            <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-amber-600' : 'text-gray-500'}`}>{label}</p>
            <p className={`text-3xl font-semibold mt-1 ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* Pending TM Approvals — manager only */}
      {isManager && isViewingSelf && pendingTMReviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Pending TM Approvals
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                {pendingTMReviews.length}
              </span>
            </h2>
            <Link href="/dashboard/internal-reviews" className="text-xs text-gray-400 hover:text-gray-600">View all →</Link>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl divide-y divide-gray-50">
            {pendingTMReviews.slice(0, 5).map(r => {
              const cand = (Array.isArray(r.candidates) ? r.candidates[0] : r.candidates) as { full_name: string; roles: unknown } | null
              const roleInfo = cand ? ((Array.isArray(cand.roles) ? (cand.roles as { title: string; clients: unknown }[])[0] : cand.roles) as { title: string; clients: unknown } | null) : null
              const clientInfo = roleInfo ? ((Array.isArray(roleInfo.clients) ? (roleInfo.clients as { name: string }[])[0] : roleInfo.clients) as { name: string } | null) : null
              return (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cand?.full_name ?? '—'}</p>
                    {roleInfo && <p className="text-xs text-gray-400 mt-0.5">{roleInfo.title}{clientInfo ? ` · ${clientInfo.name}` : ''}</p>}
                  </div>
                  <Link href={`/dashboard/internal-reviews/${r.id}`} className="text-xs font-medium text-amber-700 hover:text-amber-900">
                    Review →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Follow-Ups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Follow-Ups
            {allFollowUps.length > 0 && (
              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${overdueFollowUps.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {allFollowUps.length}
              </span>
            )}
          </h2>
          <Link href="/dashboard/tracker/follow-ups" className="text-xs text-gray-400 hover:text-gray-600">Manage all →</Link>
        </div>
        {allFollowUps.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">No open follow-ups</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-red-100 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Overdue ({overdueFollowUps.length})</h3>
              {overdueFollowUps.length === 0
                ? <p className="text-xs text-gray-400">None overdue</p>
                : overdueFollowUps.map(f => <FollowUpRow key={f.id} f={f} overdue />)
              }
            </div>
            <div className="bg-white border border-amber-100 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Due Today ({todayFollowUps.length})</h3>
              {todayFollowUps.length === 0
                ? <p className="text-xs text-gray-400">Nothing due today</p>
                : todayFollowUps.map(f => <FollowUpRow key={f.id} f={f} />)
              }
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming ({upcomingFollowUps.length})</h3>
              {upcomingFollowUps.length === 0
                ? <p className="text-xs text-gray-400">Nothing upcoming</p>
                : upcomingFollowUps.slice(0, 5).map(f => <FollowUpRow key={f.id} f={f} />)
              }
              {upcomingFollowUps.length > 5 && (
                <p className="text-xs text-gray-400 mt-2">+{upcomingFollowUps.length - 5} more — <Link href="/dashboard/tracker/follow-ups" className="underline">view all</Link></p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* My Candidates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            My Candidates
            {sortedCandidates.length > 0 && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
                {sortedCandidates.length}
              </span>
            )}
          </h2>
          <Link href="/dashboard/candidates" className="text-xs text-gray-400 hover:text-gray-600">All candidates →</Link>
        </div>
        {sortedCandidates.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">No candidates assigned to you yet</p>
            <p className="text-xs text-gray-300 mt-1">Open a candidate and use &quot;Assign to me&quot; to add them here</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Role · Client', 'Scorecard', 'Screening', "What's needed"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedCandidates.map(c => {
                  const cand = c as MyCandidateRow
                  const roleInfo = (Array.isArray(cand.roles) ? (cand.roles as { title: string; clients: unknown }[])[0] : cand.roles) as { title: string; clients: unknown } | null
                  const clientInfo = roleInfo ? ((Array.isArray(roleInfo.clients) ? (roleInfo.clients as { name: string }[])[0] : roleInfo.clients) as { name: string } | null) : null
                  const action = getCandidateAction(cand.id, cand.submitted_to_client)
                  const hasReview = reviewedSet.has(cand.id)
                  const hasScreening = screenedSet.has(cand.id)
                  return (
                    <tr key={cand.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/candidates/${cand.id}`} className="font-medium text-gray-900 hover:text-gray-600 hover:underline">
                          {cand.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-48 truncate">
                        {roleInfo?.title ?? '—'}
                        {clientInfo && <span className="text-gray-400"> · {clientInfo.name}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hasReview ? <span className="text-emerald-600 text-xs font-medium">✓ Done</span> : <span className="text-gray-400 text-xs">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hasScreening ? <span className="text-emerald-600 text-xs font-medium">✓ Done</span> : <span className="text-gray-400 text-xs">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${action.style}`}>{action.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
            <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">1st Interviews</p><p className="text-2xl font-bold text-gray-900">{w?.first_interviews ?? 0}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">2nd Interviews</p><p className="text-2xl font-bold text-gray-900">{w?.second_interviews ?? 0}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Assessments</p><p className="text-2xl font-bold text-gray-900">{w?.assessments ?? 0}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Offers Declined</p><p className="text-2xl font-bold text-gray-900">{(w as { offers_declined?: number } | null)?.offers_declined ?? 0}</p></div>
          </div>
        </div>
      )}

      {/* Revenue */}
      {hasStructuredRevenue && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Revenue Forecast</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pipeline Potential', value: structuredPotential > 0 ? formatZAR(structuredPotential) : '—', sub: 'Active roles', color: 'text-gray-900' },
              { label: 'Weighted Forecast', value: structuredWeighted > 0 ? formatZAR(Math.round(structuredWeighted)) : '—', sub: 'Probability-adjusted', color: 'text-blue-600' },
              { label: 'Total Forecast', value: forecastTotal > 0 ? formatZAR(forecastTotal) : '—', sub: 'Expected across roles', color: 'text-gray-900' },
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
              <span className="text-sm text-gray-600">Variance on placed roles</span>
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
                  {['Role', 'Client', 'My Role', 'Team', 'CVs', 'Probability', 'Next Action', 'Due'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRoles.map(t => {
                  const role = (Array.isArray(t.roles) ? (t.roles as { id: string; title: string; status: string; clients: unknown }[])[0] : t.roles) as { id: string; title: string; status: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  const prob = t.revenue_probability
                  const roleOnRole = myRoleOnRoleMap[t.role_id]
                  const teammates = teammatesMap[t.role_id] ?? []
                  return (
                    <tr key={t.role_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {roleOnRole === 'client_owner'
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">Client Owner</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Delivery</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {teammates.length > 0 ? <span className="text-xs text-gray-500">{teammates.join(', ')}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{t.cvs_submitted}</td>
                      <td className="px-4 py-3">
                        {prob != null
                          ? <span className={`font-medium ${prob >= 70 ? 'text-emerald-600' : prob >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>{prob}%</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate">{t.next_action ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {t.next_action_date ? new Date(t.next_action_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : <span className="text-gray-300">—</span>}
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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Hot Roles — Likely to Close</h2>
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
                  const role = (Array.isArray(t.roles) ? (t.roles as { title: string; clients: unknown }[])[0] : t.roles) as { title: string; clients: unknown } | null
                  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
                  return (
                    <tr key={t.role_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role?.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{client?.name ?? '—'}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-emerald-600">{t.revenue_probability}%</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.expected_revenue ? formatZAR(Number(t.expected_revenue)) : '—'}</td>
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
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            CVs Pending Review ({(pendingReviews ?? []).length})
          </h3>
          {(pendingReviews ?? []).length === 0 ? <p className="text-xs text-gray-400">None pending</p> : (
            <ul className="space-y-2">
              {(pendingReviews ?? []).slice(0, 5).map(r => {
                const candidate = (Array.isArray(r.candidates) ? r.candidates[0] : r.candidates) as { full_name: string } | null
                return (
                  <li key={r.id} className="text-xs text-gray-700">
                    <Link href={`/dashboard/internal-reviews/${r.id}`} className="hover:text-gray-900 hover:underline">{candidate?.full_name ?? '—'}</Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Approved, Not Submitted ({coApprovedNotSubmitted.length})</h3>
          {coApprovedNotSubmitted.length === 0 ? <p className="text-xs text-gray-400">None pending</p> : (
            <ul className="space-y-2">
              {coApprovedNotSubmitted.slice(0, 5).map(c => (
                <li key={c.id} className="text-xs">
                  <Link href={`/dashboard/candidates/${c.id}`} className="text-amber-700 hover:underline font-medium">{c.full_name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Awaiting Client Feedback ({submittedCandidates.length})</h3>
          {submittedCandidates.length === 0 ? <p className="text-xs text-gray-400">None pending</p> : (
            <ul className="space-y-2">
              {submittedCandidates.slice(0, 5).map(c => (
                <li key={c.id} className="text-xs">
                  <Link href={`/dashboard/candidates/${c.id}`} className="text-gray-700 hover:underline">{c.full_name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Weekly Self-Review */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Weekly Self-Review</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {selfReview ? (
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Submitted</span>
                  {selfReview.reviewed
                    ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Manager Reviewed</span>
                    : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Awaiting Manager Review</span>
                  }
                </div>
                {selfReview.overall_score != null && (
                  <p className="text-sm text-gray-600">Overall score: <span className="font-semibold text-gray-900">{Number(selfReview.overall_score).toFixed(1)}/10</span></p>
                )}
                {selfReview.manager_comments && (
                  <p className="text-xs text-gray-500 mt-2 max-w-md truncate">Manager: &quot;{selfReview.manager_comments}&quot;</p>
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
                <Link href={`/dashboard/recruiter/self-review?week=${currentWeek}`} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  Complete Self-Review
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
