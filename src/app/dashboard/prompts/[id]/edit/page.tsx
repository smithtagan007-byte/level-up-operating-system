import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PromptForm } from '../../PromptForm'

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: prompt }] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('id', user.id).single(),
    supabase.from('prompts').select('*').eq('id', id).single(),
  ])

  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    redirect('/dashboard/prompts')
  }
  if (!prompt) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Prompt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Currently v{prompt.version} — saving will increment to v{prompt.version + 1}
        </p>
      </div>
      <PromptForm existing={prompt} />
    </div>
  )
}
