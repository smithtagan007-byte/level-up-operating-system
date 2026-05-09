import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WeeklyForm } from './WeeklyForm'

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getFYWeek(date: Date): { fyYear: number; fyWeek: number } {
  // FY starts 1 Sep
  const year = date.getFullYear()
  const fyStart = new Date(date.getMonth() >= 8 ? year : year - 1, 8, 1) // Sep 1
  // Align to Monday of fyStart week
  const fyMonday = getWeekStart(fyStart)
  const diffMs = getWeekStart(date).getTime() - fyMonday.getTime()
  const fyWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  const fyYear = fyStart.getFullYear()
  return { fyYear, fyWeek }
}

function buildWeeks(count: number) {
  const weeks = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const weekStart = getWeekStart(d)
    const { fyYear, fyWeek } = getFYWeek(weekStart)
    // ISO week number (approximate)
    const startOfYear = new Date(weekStart.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((weekStart.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
    weeks.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      fyYear,
      fyWeek,
      weekNumber,
      month: weekStart.getMonth() + 1,
      year: weekStart.getFullYear(),
    })
  }
  return weeks
}

export default async function WeeklyTrackerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weeks = buildWeeks(12) // last 12 weeks
  const weekStarts = weeks.map(w => w.weekStart)

  const [{ data: salesRows }, { data: deliveryRows }, { data: submissions }] = await Promise.all([
    supabase
      .from('sales_tracker')
      .select('week_start, new_clients, signed_terms, new_roles, calls_made, follow_ups')
      .eq('user_id', user.id)
      .in('week_start', weekStarts),
    supabase
      .from('weekly_role_data')
      .select('week_start, cvs, cvs_declined, first_interviews, second_interviews, assessments, declines, offers, offers_declined, starts, revenue, cost')
      .eq('user_id', user.id)
      .in('week_start', weekStarts),
    // Count CVs auto from candidate submissions (where submitted_by = user, grouped by week)
    supabase
      .from('candidates')
      .select('created_at')
      .eq('created_by', user.id)
      .gte('created_at', new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // Build auto-CVs count per week from candidates created (proxy for CV submissions)
  const autoCvsByWeek: Record<string, number> = {}
  for (const row of submissions ?? []) {
    const ws = getWeekStart(new Date(row.created_at)).toISOString().slice(0, 10)
    autoCvsByWeek[ws] = (autoCvsByWeek[ws] ?? 0) + 1
  }

  // Merge sales + delivery into existingByWeek
  const salesMap = Object.fromEntries((salesRows ?? []).map(r => [r.week_start, r]))
  const deliveryMap = Object.fromEntries((deliveryRows ?? []).map(r => [r.week_start, r]))

  const existingByWeek: Record<string, {
    newClients: number; signedTerms: number; newRoles: number; callsMade: number; followUps: number
    cvs: number; cvsDeclined: number; firstInterviews: number; secondInterviews: number
    assessments: number; declines: number; offers: number; offersDeclined: number; starts: number
    revenue: number; cost: number
  }> = {}

  for (const ws of weekStarts) {
    const s = salesMap[ws]
    const d = deliveryMap[ws]
    if (s || d) {
      existingByWeek[ws] = {
        newClients: s?.new_clients ?? 0,
        signedTerms: s?.signed_terms ?? 0,
        newRoles: s?.new_roles ?? 0,
        callsMade: s?.calls_made ?? 0,
        followUps: s?.follow_ups ?? 0,
        cvs: d?.cvs ?? 0,
        cvsDeclined: d?.cvs_declined ?? 0,
        firstInterviews: d?.first_interviews ?? 0,
        secondInterviews: d?.second_interviews ?? 0,
        assessments: d?.assessments ?? 0,
        declines: d?.declines ?? 0,
        offers: d?.offers ?? 0,
        offersDeclined: d?.offers_declined ?? 0,
        starts: d?.starts ?? 0,
        revenue: d?.revenue ?? 0,
        cost: d?.cost ?? 0,
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Weekly KPI Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log your weekly activity. Weeks with a ✓ have been saved.</p>
      </div>
      <WeeklyForm
        userId={user.id}
        weeks={weeks}
        initialWeek={weeks[0].weekStart}
        existingByWeek={existingByWeek}
        autoCvsByWeek={autoCvsByWeek}
      />
    </div>
  )
}
