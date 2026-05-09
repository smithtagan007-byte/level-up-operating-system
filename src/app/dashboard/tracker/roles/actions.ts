'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertRoleTrackerAction(roleId: string, fields: Record<string, unknown>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('role_tracker')
    .upsert(
      { role_id: roleId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'role_id' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/tracker/roles')
}

// Phase C hook: called when a candidate is marked as submitted to client
export async function incrementRoleCvsSubmittedAction(roleId: string, clientId: string, roleTitle: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('role_tracker')
    .select('id, cvs_submitted')
    .eq('role_id', roleId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('role_tracker')
      .update({ cvs_submitted: (existing.cvs_submitted ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('role_id', roleId)
  } else {
    await supabase.from('role_tracker').insert({
      role_id: roleId,
      client_id: clientId,
      role_title: roleTitle,
      cvs_submitted: 1,
    })
  }

  revalidatePath('/dashboard/tracker/roles')
}
