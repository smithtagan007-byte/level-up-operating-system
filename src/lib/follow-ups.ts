import type { SupabaseClient } from '@supabase/supabase-js'

export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from)
  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return date
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

interface CreateFollowUpParams {
  relatedType: 'client' | 'candidate' | 'role'
  relatedId: string
  clientId?: string
  candidateId?: string
  roleId?: string
  ownerId: string
  followUpType: string
  dueDate: string
  notes?: string
}

/**
 * Creates a follow-up only if no open follow-up of the same type already exists for the same entity.
 * Silent no-op on conflict to stay idempotent.
 */
export async function createFollowUpIfNotExists(
  supabase: SupabaseClient,
  params: CreateFollowUpParams
): Promise<void> {
  const { data: existing } = await supabase
    .from('follow_ups')
    .select('id')
    .eq('related_id', params.relatedId)
    .eq('follow_up_type', params.followUpType)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return

  const insert: Record<string, unknown> = {
    related_type: params.relatedType,
    related_id: params.relatedId,
    owner_id: params.ownerId,
    follow_up_type: params.followUpType,
    due_date: params.dueDate,
    notes: params.notes ?? null,
  }

  if (params.clientId) insert.client_id = params.clientId
  if (params.candidateId) insert.candidate_id = params.candidateId
  if (params.roleId) insert.role_id = params.roleId

  await supabase.from('follow_ups').insert(insert)
}
