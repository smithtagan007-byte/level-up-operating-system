'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCandidateAction(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const role_id = formData.get('role_id') as string
  const current_company = formData.get('current_company') as string | null
  const current_title = formData.get('current_title') as string | null

  const { error } = await supabase.from('candidates').insert({
    full_name: full_name.trim(),
    email: email?.trim() || null,
    role_id,
    current_company: current_company?.trim() || null,
    current_title: current_title?.trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/candidates')
  revalidatePath(`/dashboard/roles/${role_id}`)
}

// Pipeline stage order — role and candidate stages are identical from sourcing onwards
const ROLE_STAGE_ORDER = [
  'intake', 'sourcing', 'screening', 'in_review',
  'approved', 'submitted', 'interview', 'offer',
  'started', 'probation_completed', 'closed',
]

// 1:1 mapping — candidate stage directly sets the minimum role stage
const CANDIDATE_TO_ROLE_STAGE: Record<string, string> = {
  screening:           'screening',
  in_review:           'in_review',
  approved:            'approved',
  submitted:           'submitted',
  interview:           'interview',
  offer:               'offer',
  started:             'started',
  probation_completed: 'probation_completed',
}

export async function updateCandidatePipelineStageAction(
  candidateId: string,
  stage: string,
  roleId: string
) {
  const supabase = await createClient()

  // 1. Update candidate stage
  const { error } = await supabase
    .from('candidates')
    .update({ pipeline_stage: stage })
    .eq('id', candidateId)
  if (error) throw new Error(error.message)

  // 2. Auto-advance role stage if needed (never go backward)
  const targetRoleStage = CANDIDATE_TO_ROLE_STAGE[stage]
  if (targetRoleStage) {
    const { data: role } = await supabase
      .from('roles')
      .select('status, intake_completed')
      .eq('id', roleId)
      .single()

    if (role) {
      const currentIdx = ROLE_STAGE_ORDER.indexOf(role.status)
      const targetIdx  = ROLE_STAGE_ORDER.indexOf(targetRoleStage)

      // Only advance — never regress
      if (targetIdx > currentIdx) {
        // Respect the intake gate: can't jump to sourcing without a complete intake
        const canAdvance = !(targetRoleStage === 'sourcing' && !role.intake_completed)
        if (canAdvance) {
          await supabase
            .from('roles')
            .update({ status: targetRoleStage, entered_stage_at: new Date().toISOString() })
            .eq('id', roleId)
        }
      }
    }
  }

  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/roles')
  revalidatePath('/dashboard/candidates')
}
