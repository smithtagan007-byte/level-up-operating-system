import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SelfReviewForm } from './SelfReviewForm'

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function buildWeeks(count: number): string[] {
  const weeks: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekStart(d))
  }
  return weeks
}

interface Props {
  searchParams: Promise<{ week?: string; userId?: string }>
}

export default async function SelfReviewPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weeks = buildWeeks(12)
  const weekStart = params.week && weeks.includes(params.week) ? params.week : weeks[0]

  const [{ data: myProfile }] = await Promise.all([
    supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single(),
  ])

  const isManager = ['talent_manager', 'director'].includes(myProfile?.role ?? '')

  // Determine target user — managers can view anyone, recruiters only themselves
  const targetUserId = isManager && params.userId ? params.userId : user.id
  const isViewingOwn = targetUserId === user.id

  let targetUserName: string | null = null
  if (!isViewingOwn) {
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', targetUserId)
      .single()
    targetUserName = targetProfile?.full_name ?? 'Unknown'
  }

  const { data: existing } = await supabase
    .from('weekly_self_reviews')
    .select('id, client_communication_score, candidate_communication_score, pipeline_control_score, quality_of_work_score, follow_up_discipline_score, overall_score, what_went_well, what_did_not_go_well, hot_roles, pending_feedback_or_blockers, next_week_priorities, manager_comments, reviewed, reviewed_at')
    .eq('user_id', targetUserId)
    .eq('week_start', weekStart)
    .maybeSingle()

  return (
    <SelfReviewForm
      userId={targetUserId}
      weekStart={weekStart}
      weeks={weeks}
      existing={existing ?? null}
      userRole={myProfile?.role ?? ''}
      isViewingOwn={isViewingOwn}
      targetUserName={targetUserName}
    />
  )
}
