'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCandidateAction(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const role_id = formData.get('role_id') as string

  const { error } = await supabase.from('candidates').insert({
    full_name: full_name.trim(),
    email: email?.trim() || null,
    role_id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/candidates')
}
