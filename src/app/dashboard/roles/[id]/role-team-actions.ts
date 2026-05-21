'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignTeamMemberAction(
  roleId: string,
  userId: string,
  roleOnRole: 'client_owner' | 'delivery_specialist'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.rpc('assign_team_member', {
    p_role_id:      roleId,
    p_user_id:      userId,
    p_role_on_role: roleOnRole,
    p_assigned_by:  user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/roles')
  revalidatePath('/dashboard/tracker/roles')
  revalidatePath('/dashboard/tracker/recruiter')
}

export async function removeTeamMemberAction(
  roleId: string,
  userId: string,
  roleOnRole: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.rpc('remove_team_member', {
    p_role_id:      roleId,
    p_user_id:      userId,
    p_role_on_role: roleOnRole,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/roles')
  revalidatePath('/dashboard/tracker/roles')
  revalidatePath('/dashboard/tracker/recruiter')
}
