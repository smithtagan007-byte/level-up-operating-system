'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { incrementRoleCvsSubmittedAction } from '@/app/dashboard/tracker/roles/actions'

export async function markSubmittedToClientAction(
  candidateId: string,
  roleId: string,
  clientId: string,
  roleTitle: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile) throw new Error('Profile not found')

  // Directors and managers can always action; specialists must be the delivery recruiter
  if (!['director', 'talent_manager'].includes(profile.role)) {
    const { data: tracker } = await supabase
      .from('role_tracker')
      .select('delivery_recruiter_id')
      .eq('role_id', roleId)
      .maybeSingle()

    if (!tracker || tracker.delivery_recruiter_id !== user.id) {
      throw new Error('Only the delivery recruiter, talent manager, or director can mark a candidate as submitted')
    }
  }

  const { error } = await supabase
    .from('candidates')
    .update({ submitted_to_client: true })
    .eq('id', candidateId)

  if (error) throw new Error(error.message)

  await incrementRoleCvsSubmittedAction(roleId, clientId, roleTitle)

  revalidatePath(`/dashboard/candidates/${candidateId}`)
}
