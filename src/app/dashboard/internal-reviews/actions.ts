'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function computeFinalStatus(coStatus: string, tmStatus: string): string {
  if (coStatus === 'rejected' || tmStatus === 'rejected') return 'rejected'
  if (coStatus === 'rework' || tmStatus === 'rework') return 'rework'
  if (coStatus === 'approved' && tmStatus === 'approved') return 'approved_for_formatting'
  return 'pending'
}

export async function submitForReviewAction(candidateId: string) {
  const supabase = await createClient()

  const [{ data: review }, { data: screening }, { data: candidate }] = await Promise.all([
    supabase.from('candidate_reviews').select('id').eq('candidate_id', candidateId).maybeSingle(),
    supabase.from('candidate_screenings').select('id').eq('candidate_id', candidateId).maybeSingle(),
    supabase.from('candidates').select('role_id').eq('id', candidateId).single(),
  ])

  if (!review || !screening) {
    throw new Error('Both the scorecard and screening form must be completed before submitting for review.')
  }
  if (!candidate?.role_id) throw new Error('Candidate has no assigned role.')

  const { error } = await supabase.from('internal_reviews').insert({
    candidate_id: candidateId,
    role_id: candidate.role_id,
  })

  if (error) {
    if (error.code === '23505') throw new Error('This candidate has already been submitted for internal review.')
    throw new Error(error.message)
  }

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/internal-reviews')
  revalidatePath('/dashboard')
}

export async function updateApprovalAction(
  reviewId: string,
  panelType: 'client_owner' | 'talent_manager',
  status: 'approved' | 'rework' | 'rejected',
  notes: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (panelType === 'client_owner') {
    // CO panel is for the recruiter assigned to the client, not a role check
    const { data: reviewData } = await supabase
      .from('internal_reviews')
      .select('roles(clients(owner_id))')
      .eq('id', reviewId)
      .single()

    const roleRaw = Array.isArray(reviewData?.roles) ? reviewData.roles[0] : reviewData?.roles
    const clientRaw = Array.isArray(roleRaw?.clients) ? roleRaw.clients[0] : roleRaw?.clients
    const clientOwnerId = (clientRaw as { owner_id: string | null } | null)?.owner_id

    if (clientOwnerId !== user.id) {
      throw new Error('Only the recruiter assigned to this client can action this panel.')
    }
  }
  if (panelType === 'talent_manager' && !['talent_manager', 'director'].includes(profile?.role ?? '')) {
    throw new Error('Only Talent Managers or Directors can action this panel.')
  }
  if ((status === 'rework' || status === 'rejected') && !notes.trim()) {
    throw new Error('Notes are required when requesting rework or rejecting.')
  }

  const { data: existing } = await supabase
    .from('internal_reviews')
    .select('client_owner_status, talent_manager_status, candidate_id')
    .eq('id', reviewId)
    .single()

  if (!existing) throw new Error('Review not found.')

  const updates: Record<string, unknown> = {}

  if (panelType === 'client_owner') {
    updates.client_owner_status = status
    updates.client_owner_notes = notes.trim() || null
    updates.client_owner_id = user.id
  } else {
    updates.talent_manager_status = status
    updates.talent_manager_notes = notes.trim() || null
    updates.talent_manager_id = user.id
  }

  const newCoStatus = panelType === 'client_owner' ? status : existing.client_owner_status
  const newTmStatus = panelType === 'talent_manager' ? status : existing.talent_manager_status
  updates.final_status = computeFinalStatus(newCoStatus, newTmStatus)

  const { error } = await supabase.from('internal_reviews').update(updates).eq('id', reviewId)
  if (error) throw new Error(error.message)

  // Sync approval flags on candidate
  const candidateUpdates: Record<string, boolean> = {}
  if (panelType === 'client_owner') candidateUpdates.client_owner_approved = status === 'approved'
  if (panelType === 'talent_manager') candidateUpdates.talent_manager_approved = status === 'approved'

  await supabase.from('candidates').update(candidateUpdates).eq('id', existing.candidate_id)

  revalidatePath(`/dashboard/internal-reviews/${reviewId}`)
  revalidatePath('/dashboard/internal-reviews')
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/candidates/${existing.candidate_id}`)
}
