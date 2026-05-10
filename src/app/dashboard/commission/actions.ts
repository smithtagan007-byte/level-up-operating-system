'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertDirector() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'director') throw new Error('Director access required')
  return { supabase }
}

export interface PlacementPayload {
  staff_name?: string | null
  recruiter_id?: string | null
  client_invoice_date?: string | null
  client: string
  candidate_name: string
  role_name: string
  start_date?: string | null
  annual_ctc?: number | null
  placement_fee_percentage?: number | null
  placement_fee?: number | null
  invoice_number?: string | null
  client_paid?: boolean
  commission_percentage?: number | null
  commission_earned?: number | null
  commission_month?: string | null
  payroll_month?: string | null
  commission_paid?: number | null
  ts_earned?: number | null
  payroll_commission?: number | null
  payroll_advance?: number | null
  advance_paid?: number | null
  notes?: string | null
}

export async function createPlacementAction(payload: PlacementPayload): Promise<{ id: string }> {
  const { supabase } = await assertDirector()
  const { data, error } = await supabase
    .from('placements')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/commission')
  return { id: (data as { id: string }).id }
}

export async function updatePlacementAction(id: string, payload: PlacementPayload): Promise<void> {
  const { supabase } = await assertDirector()
  const { error } = await supabase
    .from('placements')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/commission')
  revalidatePath(`/dashboard/commission/${id}/edit`)
}
