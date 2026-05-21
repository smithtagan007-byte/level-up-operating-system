'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { incrementRoleCvsSubmittedAction } from '@/app/dashboard/tracker/roles/actions'
import { createFollowUpIfNotExists, addBusinessDays, toDateString } from '@/lib/follow-ups'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function logEvent(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  eventType: string,
  actorId: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from('activity_events').insert({
    entity_type: entityType,
    entity_id: entityId,
    event_type: eventType,
    actor_id: actorId,
    metadata: metadata ?? {},
  })
}

async function createActionItem(
  supabase: SupabaseClient,
  opts: {
    type: string
    ownerId: string
    entityType: string
    entityId: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description?: string
    dueAt?: string
  }
) {
  await supabase.from('action_items').insert({
    type: opts.type,
    owner_id: opts.ownerId,
    related_entity_type: opts.entityType,
    related_entity_id: opts.entityId,
    priority: opts.priority,
    title: opts.title,
    description: opts.description ?? null,
    due_at: opts.dueAt ?? null,
  })
}

async function resolveActionItems(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  type?: string
) {
  const now = new Date().toISOString()
  if (type) {
    await supabase.from('action_items').update({ resolved_at: now })
      .eq('related_entity_type', entityType).eq('related_entity_id', entityId)
      .eq('type', type).is('resolved_at', null).is('dismissed_at', null)
  } else {
    await supabase.from('action_items').update({ resolved_at: now })
      .eq('related_entity_type', entityType).eq('related_entity_id', entityId)
      .is('resolved_at', null).is('dismissed_at', null)
  }
}

async function checkRolePermission(supabase: SupabaseClient, userId: string, roleId: string) {
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', userId).single()
  if (!profile) throw new Error('Profile not found')
  if (['director', 'talent_manager'].includes(profile.role)) return
  const { data: teamMember } = await supabase
    .from('role_team').select('id')
    .eq('role_id', roleId).eq('user_id', userId).eq('is_active', true).maybeSingle()
  if (!teamMember) throw new Error('Only a team member on this role, talent manager, or director can perform this action')
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function createSubmissionAction(
  candidateId: string,
  roleId: string,
  clientId: string,
  roleTitle: string,
  submissionNote?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await checkRolePermission(supabase, user.id, roleId)

  // Find current latest version
  const { data: existing } = await supabase
    .from('candidate_submissions')
    .select('id, version')
    .eq('candidate_id', candidateId)
    .eq('role_id', roleId)
    .eq('is_latest', true)
    .maybeSingle()

  const nextVersion = existing ? existing.version + 1 : 1
  const isFirstSubmission = !existing

  // Archive previous latest
  if (existing) {
    await supabase
      .from('candidate_submissions')
      .update({ is_latest: false })
      .eq('id', existing.id)
  }

  // Create new submission record
  const { data: submission, error } = await supabase
    .from('candidate_submissions')
    .insert({
      candidate_id: candidateId,
      role_id: roleId,
      version: nextVersion,
      submitted_by: user.id,
      submission_note: submissionNote?.trim() || null,
      feedback_status: 'submitted',
      is_latest: true,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Keep boolean cache on candidates table
  await supabase.from('candidates').update({ submitted_to_client: true }).eq('id', candidateId)

  // Only increment CV counter on first submission
  if (isFirstSubmission) {
    await incrementRoleCvsSubmittedAction(roleId, clientId, roleTitle)
  }

  // Auto follow-up for first submission
  if (isFirstSubmission) {
    const { data: client } = await supabase.from('clients').select('owner_id').eq('id', clientId).maybeSingle()
    if (client?.owner_id) {
      await createFollowUpIfNotExists(supabase, {
        relatedType: 'candidate',
        relatedId: candidateId,
        candidateId,
        ownerId: client.owner_id,
        followUpType: 'Submission Feedback',
        dueDate: toDateString(addBusinessDays(new Date(), 2)),
      })
    }
  }

  // Log event
  await logEvent(supabase, 'submission', submission.id,
    isFirstSubmission ? 'candidate_submitted' : 'submission_resubmitted',
    user.id, { version: nextVersion, candidate_id: candidateId, role_id: roleId }
  )

  // Resolve any "submit to client" action items for this candidate
  await resolveActionItems(supabase, 'candidate', candidateId, 'submit_to_client')

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
  revalidatePath('/dashboard')
}

export async function updateSubmissionFeedbackAction(
  submissionId: string,
  candidateId: string,
  feedbackStatus: string,
  clientFeedback?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('candidate_submissions')
    .update({
      feedback_status: feedbackStatus,
      client_feedback: clientFeedback?.trim() || null,
    })
    .eq('id', submissionId)

  if (error) throw new Error(error.message)

  await logEvent(supabase, 'submission', submissionId, 'submission_feedback_updated', user.id,
    { feedback_status: feedbackStatus, candidate_id: candidateId }
  )

  // If interview requested, create action item for the assigned specialist
  if (feedbackStatus === 'interview_requested') {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('assigned_to, full_name')
      .eq('id', candidateId)
      .maybeSingle()

    if (candidate?.assigned_to) {
      await createActionItem(supabase, {
        type: 'schedule_interview',
        ownerId: candidate.assigned_to,
        entityType: 'candidate',
        entityId: candidateId,
        priority: 'high',
        title: `Schedule interview for ${candidate.full_name}`,
        description: 'Client has requested an interview. Schedule and log it.',
        dueAt: addBusinessDays(new Date(), 1).toISOString(),
      })
    }
  }

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard')
}

// ─── Interviews ───────────────────────────────────────────────────────────────

export async function scheduleInterviewAction(opts: {
  candidateId: string
  roleId: string
  submissionId: string
  interviewStage: string
  scheduledAt: string
  interviewerName?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: interview, error } = await supabase
    .from('candidate_interviews')
    .insert({
      candidate_submission_id: opts.submissionId,
      candidate_id: opts.candidateId,
      role_id: opts.roleId,
      interview_stage: opts.interviewStage,
      scheduled_at: opts.scheduledAt,
      interviewer_name: opts.interviewerName?.trim() || null,
      status: 'scheduled',
      outcome: 'pending',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await logEvent(supabase, 'interview', interview.id, 'interview_scheduled', user.id,
    { candidate_id: opts.candidateId, role_id: opts.roleId, stage: opts.interviewStage }
  )

  // Resolve "schedule interview" action items
  await resolveActionItems(supabase, 'candidate', opts.candidateId, 'schedule_interview')

  revalidatePath(`/dashboard/candidates/${opts.candidateId}`)
  revalidatePath('/dashboard')
}

export async function updateInterviewOutcomeAction(opts: {
  interviewId: string
  candidateId: string
  status: string
  outcome: string
  feedback?: string
  completedAt?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('candidate_interviews')
    .update({
      status: opts.status,
      outcome: opts.outcome,
      feedback: opts.feedback?.trim() || null,
      completed_at: opts.completedAt || new Date().toISOString(),
    })
    .eq('id', opts.interviewId)

  if (error) throw new Error(error.message)

  await logEvent(supabase, 'interview', opts.interviewId, 'interview_outcome_logged', user.id,
    { outcome: opts.outcome, candidate_id: opts.candidateId }
  )

  revalidatePath(`/dashboard/candidates/${opts.candidateId}`)
  revalidatePath('/dashboard')
}

// ─── Offers ───────────────────────────────────────────────────────────────────

export async function createOfferAction(opts: {
  candidateId: string
  roleId: string
  submissionId: string
  offeredSalary?: number
  startDate?: string
  noticePeriodDays?: number
  replacementRisk?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: offer, error } = await supabase
    .from('offers')
    .insert({
      candidate_submission_id: opts.submissionId,
      candidate_id: opts.candidateId,
      role_id: opts.roleId,
      offered_salary: opts.offeredSalary ?? null,
      start_date: opts.startDate ?? null,
      notice_period_days: opts.noticePeriodDays ?? null,
      replacement_risk: opts.replacementRisk ?? null,
      status: 'pending',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await logEvent(supabase, 'offer', offer.id, 'offer_made', user.id,
    { candidate_id: opts.candidateId, role_id: opts.roleId }
  )

  revalidatePath(`/dashboard/candidates/${opts.candidateId}`)
  revalidatePath('/dashboard')
}

export async function updateOfferStatusAction(opts: {
  offerId: string
  candidateId: string
  status: string
  declinedReason?: string
  counterOffered?: boolean
  replacementRisk?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('offers')
    .update({
      status: opts.status,
      counter_offered: opts.counterOffered ?? false,
      declined_reason: opts.declinedReason?.trim() || null,
      replacement_risk: opts.replacementRisk ?? null,
      accepted_at: opts.status === 'accepted' ? now : null,
      declined_at: ['declined', 'withdrawn'].includes(opts.status) ? now : null,
    })
    .eq('id', opts.offerId)

  if (error) throw new Error(error.message)

  await logEvent(supabase, 'offer', opts.offerId,
    opts.status === 'accepted' ? 'offer_accepted' : 'offer_declined',
    user.id, { status: opts.status, candidate_id: opts.candidateId }
  )

  revalidatePath(`/dashboard/candidates/${opts.candidateId}`)
  revalidatePath('/dashboard')
}

// ─── Legacy actions (unchanged) ───────────────────────────────────────────────

export async function updateCandidateNameAction(candidateId: string, fullName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmed = fullName.trim()
  if (!trimmed) throw new Error('Name cannot be empty')

  const { error } = await supabase
    .from('candidates')
    .update({ full_name: trimmed })
    .eq('id', candidateId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
}

export async function assignCandidateAction(candidateId: string, userId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('candidates')
    .update({ assigned_to: userId })
    .eq('id', candidateId)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
  revalidatePath('/dashboard/tracker/recruiter')
}
