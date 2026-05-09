import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PromptLibraryClient } from './PromptLibraryClient'

export default async function PromptLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: prompts }, { data: profile }] = await Promise.all([
    supabase
      .from('prompts')
      .select('id, name, category, purpose, version, is_active')
      .eq('is_active', true)
      .order('category')
      .order('name'),
    supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
  ])

  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prompt Library</h1>
          <p className="text-sm text-gray-500 mt-1">Pre-approved AI prompts for every stage of the recruitment process</p>
        </div>
      </div>
      <PromptLibraryClient
        prompts={prompts ?? []}
        isManager={isManager}
      />
    </div>
  )
}
