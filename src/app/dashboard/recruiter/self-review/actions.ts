'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SelfReviewPayload {
  userId: string
  weekStart: string
  clientCommunicationScore: number
  candidateCommunicationScore: number
  pipelineControlScore: number
  qualityOfWorkScore: number
  followUpDisciplineScore: number
  whatWentWell: string
  whatDidNotGoWell: string
  hotRoles: string
  pendingFeedbackOrBlockers: string
  nextWeekPriorities: string
}

export async function saveSelfReviewAction(payload: SelfReviewPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.id !== payload.userId) throw new Error('Cannot save another user\'s self-review')

  const { error } = await supabase
    .from('weekly_self_reviews')
    .upsert(
      {
        user_id: payload.userId,
        week_start: payload.weekStart,
        client_communication_score: payload.clientCommunicationScore,
        candidate_communication_score: payload.candidateCommunicationScore,
        pipeline_control_score: payload.pipelineControlScore,
        quality_of_work_score: payload.qualityOfWorkScore,
        follow_up_discipline_score: payload.followUpDisciplineScore,
        what_went_well: payload.whatWentWell,
        what_did_not_go_well: payload.whatDidNotGoWell,
        hot_roles: payload.hotRoles,
        pending_feedback_or_blockers: payload.pendingFeedbackOrBlockers,
        next_week_priorities: payload.nextWeekPriorities,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    )

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/recruiter/self-review')
  revalidatePath('/dashboard/tracker/recruiter')
  revalidatePath('/dashboard/tracker/manager')
  revalidatePath('/dashboard/tracker/director')
}

export async function managerReviewAction(
  targetUserId: string,
  weekStart: string,
  managerComments: string,
  markReviewed: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    throw new Error('Only Talent Managers and Directors can submit manager reviews')
  }

  const updateData: Record<string, unknown> = {
    manager_comments: managerComments || null,
    updated_at: new Date().toISOString(),
  }

  if (markReviewed) {
    updateData.reviewed = true
    updateData.reviewed_at = new Date().toISOString()
  } else {
    updateData.reviewed = false
    updateData.reviewed_at = null
  }

  const { error } = await supabase
    .from('weekly_self_reviews')
    .update(updateData)
    .eq('user_id', targetUserId)
    .eq('week_start', weekStart)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/recruiter/self-review')
  revalidatePath('/dashboard/tracker/manager')
  revalidatePath('/dashboard/tracker/director')
}
