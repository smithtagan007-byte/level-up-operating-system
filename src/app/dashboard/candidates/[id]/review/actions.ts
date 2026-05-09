'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CandidateTier, RiskLevel } from '@/types'

export interface ReviewData {
  industry_fit: number
  technical_fit: number
  contextual_skill: number
  qualification: number
  communication: number
  stability: number
  motivation: number
  salary_alignment: number
  location_alignment: number
  culture_fit: number
  risk_score: number
  tier: CandidateTier
  evidence_notes: string
  risk_notes: string
}

function riskScoreToLevel(score: number): RiskLevel {
  if (score <= 3) return 'Low'
  if (score <= 6) return 'Medium'
  if (score <= 8) return 'High'
  return 'Critical'
}

export async function saveReviewAction(candidateId: string, data: ReviewData) {
  const supabase = await createClient()

  const { error: reviewError } = await supabase
    .from('candidate_reviews')
    .upsert(
      { candidate_id: candidateId, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'candidate_id' }
    )

  if (reviewError) throw new Error(reviewError.message)

  const { error: candidateError } = await supabase
    .from('candidates')
    .update({ tier: data.tier, risk_level: riskScoreToLevel(data.risk_score) })
    .eq('id', candidateId)

  if (candidateError) throw new Error(candidateError.message)

  revalidatePath(`/dashboard/candidates/${candidateId}`)
  revalidatePath('/dashboard/candidates')
}
