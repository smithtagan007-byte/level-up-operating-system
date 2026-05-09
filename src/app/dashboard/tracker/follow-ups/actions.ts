'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFollowUpAction(formData: FormData) {
  const supabase = await createClient()

  const related_type = formData.get('related_type') as string
  const related_id = formData.get('related_id') as string
  const owner_id = formData.get('owner_id') as string
  const follow_up_type = formData.get('follow_up_type') as string
  const follow_up_reason = formData.get('follow_up_reason') as string
  const due_date = formData.get('due_date') as string
  const notes = formData.get('notes') as string

  const insert: Record<string, unknown> = {
    related_type,
    related_id,
    owner_id,
    follow_up_type: follow_up_type.trim(),
    follow_up_reason: follow_up_reason?.trim() || null,
    due_date,
    notes: notes?.trim() || null,
  }

  if (related_type === 'client') insert.client_id = related_id
  if (related_type === 'candidate') insert.candidate_id = related_id
  if (related_type === 'role') insert.role_id = related_id

  const { error } = await supabase.from('follow_ups').insert(insert)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/tracker/follow-ups')
}

export async function markFollowUpCompleteAction(followUpId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('follow_ups')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', followUpId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tracker/follow-ups')
}
