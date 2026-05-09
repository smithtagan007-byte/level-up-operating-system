'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RevenuePayload {
  feeType: 'percentage' | 'fixed'
  feePercentage: number
  fixedFeeAmount: number | null
  salaryBasis: string
  estimatedCTC: number | null
  manualOverride: boolean
  potentialRevenue: number | null
  forecastProbability: number | null
  revenueStatus: string
  actualPlacementCTC: number | null
  actualRevenue: number | null
  invoiceStatus: string
  closedLostReason: string
  lostRevenue: number | null
  notes: string
}

export async function upsertRoleRevenueAction(roleId: string, payload: RevenuePayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Compute potential_revenue unless manual override
  let potentialRevenue = payload.potentialRevenue
  if (!payload.manualOverride) {
    if (payload.feeType === 'percentage' && payload.estimatedCTC && payload.feePercentage) {
      potentialRevenue = payload.estimatedCTC * (payload.feePercentage / 100)
    } else if (payload.feeType === 'fixed' && payload.fixedFeeAmount) {
      potentialRevenue = payload.fixedFeeAmount
    }
  }

  // Compute actual_revenue unless manual override
  let actualRevenue = payload.actualRevenue
  if (!payload.manualOverride && payload.actualPlacementCTC) {
    if (payload.feeType === 'percentage' && payload.feePercentage) {
      actualRevenue = payload.actualPlacementCTC * (payload.feePercentage / 100)
    } else if (payload.feeType === 'fixed' && payload.fixedFeeAmount) {
      actualRevenue = payload.fixedFeeAmount
    }
  }

  const { error } = await supabase
    .from('role_revenue')
    .upsert(
      {
        role_id: roleId,
        fee_type: payload.feeType,
        placement_fee_percentage: payload.feePercentage,
        fixed_fee_amount: payload.fixedFeeAmount ?? null,
        salary_basis: payload.salaryBasis || null,
        estimated_candidate_ctc: payload.estimatedCTC ?? null,
        potential_revenue: potentialRevenue ?? null,
        forecast_probability: payload.forecastProbability ?? null,
        actual_placement_ctc: payload.actualPlacementCTC ?? null,
        actual_revenue: actualRevenue ?? null,
        revenue_status: payload.revenueStatus,
        invoice_status: payload.invoiceStatus || 'Not Invoiced',
        closed_lost_reason: payload.closedLostReason || null,
        lost_revenue: payload.lostRevenue ?? null,
        manual_override: payload.manualOverride,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'role_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/roles/${roleId}`)
  revalidatePath('/dashboard/tracker/roles')
  revalidatePath('/dashboard/tracker/director')
  revalidatePath('/dashboard/tracker/recruiter')
  revalidatePath('/dashboard/tracker/manager')
}
