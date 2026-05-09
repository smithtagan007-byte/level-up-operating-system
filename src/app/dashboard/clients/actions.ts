'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const grade = formData.get('grade') as string
  const owner_id = formData.get('owner_id') as string

  const { error } = await supabase.from('clients').insert({
    name: name.trim(),
    industry: industry?.trim() || null,
    grade: grade || null,
    owner_id: owner_id || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
}

export async function updateClientOwnerAction(clientId: string, ownerId: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('clients')
    .update({ owner_id: ownerId || null })
    .eq('id', clientId)

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath('/dashboard/clients')
}
