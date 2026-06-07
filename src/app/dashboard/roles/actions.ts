'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRoleAction(formData: FormData): Promise<{ id: string }> {
  const supabase = await createClient()

  const title = formData.get('title') as string
  const client_id = formData.get('client_id') as string

  const { data, error } = await supabase.from('roles').insert({
    title: title.trim(),
    client_id,
    status: 'intake',
    intake_completed: false,
  }).select('id').single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/roles')
  return { id: (data as { id: string }).id }
}

// Valid pipeline order — identical to candidate stages from sourcing onwards
const PIPELINE_ORDER = [
  'intake', 'sourcing', 'screening', 'in_review',
  'approved', 'submitted', 'interview', 'offer',
  'started', 'probation_completed', 'closed',
]
export { PIPELINE_ORDER }

export async function updateRoleStatusAction(roleId: string, newStatus: string) {
  const supabase = await createClient()

  if (newStatus === 'sourcing') {
    const { data: role } = await supabase
      .from('roles')
      .select('intake_completed')
      .eq('id', roleId)
      .single()

    if (!role?.intake_completed) {
      throw new Error('Role intake must be completed before moving to sourcing.')
    }
  }

  const { error } = await supabase
    .from('roles')
    .update({ status: newStatus, entered_stage_at: new Date().toISOString() })
    .eq('id', roleId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/roles')
  revalidatePath(`/dashboard/roles/${roleId}`)
}

export async function updateRoleActivityStatusAction(roleId: string, activityStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('roles')
    .update({ activity_status: activityStatus })
    .eq('id', roleId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/roles')
}

export async function markIntakeCompleteAction(roleId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('roles')
    .update({ intake_completed: true })
    .eq('id', roleId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/roles')
  revalidatePath(`/dashboard/roles/${roleId}`)
}
