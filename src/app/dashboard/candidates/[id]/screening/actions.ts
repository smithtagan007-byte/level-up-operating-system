'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ScreeningData {
  motivation: string
  reason_for_leaving: string
  growth_drivers: string
  pain_points: string
  notice_period: string
  competing_interviews: string
  counteroffer_risk: 'Low' | 'Medium' | 'High'
  career_goals: string
  communication_quality: string
  recruiter_concerns: string
  leverage_points: string
}

export async function saveScreeningAction(candidateId: string, data: ScreeningData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('candidate_screenings')
    .upsert(
      { candidate_id: candidateId, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/candidates/${candidateId}`)
}
