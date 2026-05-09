import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PromptForm } from '../PromptForm'

export default async function NewPromptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    redirect('/dashboard/prompts')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Prompt</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new pre-approved prompt to the library</p>
      </div>
      <PromptForm />
    </div>
  )
}
