'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface WeeklyPayload {
  userId: string
  weekStart: string
  fyYear: number
  fyWeek: number
  weekNumber: number
  month: number
  year: number
  // sales
  newClients: number
  signedTerms: number
  newRoles: number
  callsMade: number
  followUps: number
  // delivery
  cvs: number
  cvsDeclined: number
  firstInterviews: number
  secondInterviews: number
  assessments: number
  declines: number
  offers: number
  offersDeclined: number
  starts: number
  revenue: number
  cost: number
}

export async function saveWeeklyDataAction(payload: WeeklyPayload) {
  const supabase = await createClient()

  const salesUpsert = supabase.from('sales_tracker').upsert(
    {
      user_id: payload.userId,
      week_start: payload.weekStart,
      fy_year: payload.fyYear,
      fy_week: payload.fyWeek,
      week_number: payload.weekNumber,
      month: payload.month,
      year: payload.year,
      new_clients: payload.newClients,
      signed_terms: payload.signedTerms,
      new_roles: payload.newRoles,
      calls_made: payload.callsMade,
      follow_ups: payload.followUps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  const deliveryUpsert = supabase.from('weekly_role_data').upsert(
    {
      user_id: payload.userId,
      week_start: payload.weekStart,
      fy_year: payload.fyYear,
      fy_week: payload.fyWeek,
      week_number: payload.weekNumber,
      month: payload.month,
      year: payload.year,
      cvs: payload.cvs,
      cvs_declined: payload.cvsDeclined,
      first_interviews: payload.firstInterviews,
      second_interviews: payload.secondInterviews,
      assessments: payload.assessments,
      declines: payload.declines,
      offers: payload.offers,
      offers_declined: payload.offersDeclined,
      starts: payload.starts,
      revenue: payload.revenue,
      cost: payload.cost,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  )

  const [{ error: e1 }, { error: e2 }] = await Promise.all([salesUpsert, deliveryUpsert])
  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)

  revalidatePath('/dashboard/tracker/weekly')
  revalidatePath('/dashboard/tracker/manager')
  revalidatePath('/dashboard/tracker/director')
}
