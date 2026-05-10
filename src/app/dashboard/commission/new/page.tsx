import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlacementForm } from '../PlacementForm'
import type { Recruiter } from '../types'

export default async function NewPlacementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'director') redirect('/dashboard/commission')

  const { data: rawRecruiters } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .order('full_name')

  return (
    <PlacementForm
      mode="new"
      recruiters={(rawRecruiters ?? []) as Recruiter[]}
    />
  )
}
