'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dismissActionItemAction(actionItemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('action_items')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', actionItemId)
    .eq('owner_id', user.id)

  revalidatePath('/dashboard')
}
