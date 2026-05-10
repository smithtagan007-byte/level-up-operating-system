import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PlacementForm } from '../../PlacementForm'
import type { Placement, Recruiter } from '../../types'

export default async function EditPlacementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'director') redirect('/dashboard/commission')

  const [{ data: rawPlacement }, { data: rawRecruiters }] = await Promise.all([
    supabase.from('placements').select('*').eq('id', id).single(),
    supabase.from('user_profiles').select('id, full_name').order('full_name'),
  ])

  if (!rawPlacement) notFound()

  const placement = rawPlacement as Placement

  return (
    <PlacementForm
      mode="edit"
      placementId={id}
      initialData={placement}
      recruiters={(rawRecruiters ?? []) as Recruiter[]}
    />
  )
}
