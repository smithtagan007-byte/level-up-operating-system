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

// ─── Client Profile ───────────────────────────────────────────────────────────

export interface ClientProfileData {
  industry?: string | null
  website?: string | null
  linkedin_url?: string | null
  location?: string | null
  headcount?: number | null
  relationship_health?: string | null
  relationship_notes?: string | null
  culture_notes?: string | null
  hiring_preferences?: string | null
  fee_percentage?: number | null
  payment_terms_days?: number | null
  warranty_period_days?: number | null
}

export async function updateClientProfileAction(clientId: string, data: ClientProfileData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('clients').update(data).eq('id', clientId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/clients/${clientId}`)
  revalidatePath('/dashboard/clients')
}

// ─── Client Contacts ──────────────────────────────────────────────────────────

export interface ContactData {
  name: string
  title?: string | null
  email?: string | null
  phone?: string | null
  is_primary?: boolean
  notes?: string | null
}

export async function addClientContactAction(clientId: string, contact: ContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('client_contacts').insert({ client_id: clientId, ...contact })
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/clients/${clientId}`)
}

export async function updateClientContactAction(contactId: string, clientId: string, contact: ContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('client_contacts')
    .update({ ...contact, updated_at: new Date().toISOString() })
    .eq('id', contactId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/clients/${clientId}`)
}

export async function deleteClientContactAction(contactId: string, clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('client_contacts').delete().eq('id', contactId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/clients/${clientId}`)
}
