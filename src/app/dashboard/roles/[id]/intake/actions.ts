'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isIntakeComplete, type IntakeData } from './types'

export async function saveRoleIntakeAction(roleId: string, data: IntakeData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const complete = isIntakeComplete(data)

  // Sanitize: empty strings must be null for DATE and numeric columns
  const sanitized: IntakeData = {
    ...data,
    start_date: data.start_date || null,
    level: data.level || null,
    department: data.department || null,
    reports_to: data.reports_to || null,
    location: data.location || null,
    work_model: data.work_model || null,
    employment_type: data.employment_type || null,
    bonus_notes: data.bonus_notes || null,
    benefits_notes: data.benefits_notes || null,
    qualifications_required: data.qualifications_required || null,
    ideal_candidate_profile: data.ideal_candidate_profile || null,
    personal_attributes: data.personal_attributes || null,
    culture_fit_notes: data.culture_fit_notes || null,
    interview_process_notes: data.interview_process_notes || null,
    decision_timeline: data.decision_timeline || null,
    role_reason: data.role_reason || null,
    team_context: data.team_context || null,
    red_flags: data.red_flags || null,
  }

  const { error } = await supabase
    .from('role_intake')
    .upsert(
      {
        role_id: roleId,
        ...sanitized,
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
