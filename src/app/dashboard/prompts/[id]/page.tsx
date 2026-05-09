import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PromptDetailClient } from './PromptDetailClient'

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: prompt }, { data: profile }] = await Promise.all([
    supabase.from('prompts').select('*').eq('id', id).single(),
    supabase.from('user_profiles').select('role').eq('id', user.id).single(),
  ])

  if (!prompt) notFound()

  const approverName = prompt.approved_by
    ? (await supabase.from('user_profiles').select('full_name').eq('id', prompt.approved_by).single()).data?.full_name ?? null
    : null

  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  return (
    <PromptDetailClient
      prompt={prompt}
      approverName={approverName}
      isManager={isManager}
    />
  )
}
