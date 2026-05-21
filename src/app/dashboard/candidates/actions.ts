'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCandidateAction(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const role_id = formData.get('role_id') as string
  const current_company = formData.get('current_company') as string | null
  const current_title = formData.get('current_title') as string | null

  const { error } = await supabase.from('candidates').insert({
    full_name: full_name.trim(),
    email: email?.trim() || null,
    role_id,
    current_company: current_company?.trim() || null,
    current_title: current_title?.trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/candidates')
  revalidatePath(`/dashboard/roles/${role_id}`)
}
