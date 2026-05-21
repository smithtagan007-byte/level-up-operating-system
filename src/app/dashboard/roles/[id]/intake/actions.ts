'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isIntakeComplete, type IntakeData } from './types'

export type { IntakeData }

export async function saveRoleIntakeAction(roleId: string, data: IntakeData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const complete = isIntakeComplete(data)

  const { error } = await supabase
    .from('role_intake')
    .upsert(
      {
        role_id: roleId,
        ...data,
        completed_at: complete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'role_id' }
    )

  if (error) throw new Error(error.message)

  await supabase
    .from('roles')
    .update({ intake_completed: complete })
    .eq('id', roleId)

  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath(`/dashboard/roles/${roleId}/intake`)
  revalidatePath('/dashboard/roles')

  return { complete }
}
