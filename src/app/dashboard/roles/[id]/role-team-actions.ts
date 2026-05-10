'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertManager(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    throw new Error('Only Talent Managers and Directors can manage role teams.')
  }
}

export async function assignTeamMemberAction(
  roleId: string,
  userId: string,
  roleOnRole: 'client_owner' | 'delivery_specialist'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await assertManager(supabase, user.id)

  // If assigning a new client_owner, deactivate any existing one first
  if (roleOnRole === 'client_owner') {
    await supabase
      .from('role_team')
      .update({ is_active: false })
      .eq('role_id', roleId)
      .eq('role_on_role', 'client_owner')
      .eq('is_active', true)
      .neq('user_id', userId)
  }

  const { error } = await supabase.from('role_team').upsert(
    {
      role_id: roleId,
      user_id: userId,
      role_on_role: roleOnRole,
      assigned_by: user.id,
      assigned_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    },
    { onConflict: 'role_id,user_id,role_on_role' }
  )

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/roles')
  revalidatePath('/dashboard/tracker/roles')
}

export async function removeTeamMemberAction(
  roleId: string,
  userId: string,
  roleOnRole: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await assertManager(supabase, user.id)

  const { error } = await supabase
    .from('role_team')
    .update({ is_active: false })
    .eq('role_id', roleId)
    .eq('user_id', userId)
    .eq('role_on_role', roleOnRole)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/roles')
  revalidatePath('/dashboard/tracker/roles')
}
