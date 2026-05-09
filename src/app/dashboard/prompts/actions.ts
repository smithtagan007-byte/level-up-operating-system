'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PromptPayload {
  name: string
  category: string
  purpose: string
  when_to_use: string
  prompt_text: string
  required_inputs: string
  expected_output: string
  example_output: string
}

async function assertManagerRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    throw new Error('Insufficient permissions')
  }
  return { supabase, user }
}

export async function createPromptAction(payload: PromptPayload): Promise<{ id: string }> {
  const { supabase, user } = await assertManagerRole()
  const { data, error } = await supabase
    .from('prompts')
    .insert({ ...payload, approved_by: user.id, version: 1, is_active: true })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/prompts')
  return { id: data.id }
}

export async function updatePromptAction(id: string, payload: PromptPayload): Promise<void> {
  const { supabase, user } = await assertManagerRole()
  const { data: existing } = await supabase
    .from('prompts')
    .select('version')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('prompts')
    .update({
      ...payload,
      version: (existing?.version ?? 1) + 1,
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/prompts')
  revalidatePath(`/dashboard/prompts/${id}`)
}

export async function deactivatePromptAction(id: string): Promise<void> {
  const { supabase } = await assertManagerRole()
  const { error } = await supabase
    .from('prompts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/prompts')
}
