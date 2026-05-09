'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function saveArticleAction(
  articleId: string,
  content: string,
  changeSummary: string
): Promise<void> {
  if (!changeSummary.trim()) throw new Error('Change summary is required')
  const { supabase, user } = await assertManagerRole()

  const { data: existing } = await supabase
    .from('manual_articles')
    .select('content')
    .eq('id', articleId)
    .single()

  const { error: versionError } = await supabase
    .from('manual_article_versions')
    .insert({
      article_id: articleId,
      previous_content: existing?.content ?? null,
      new_content: content,
      changed_by: user.id,
      change_summary: changeSummary.trim(),
    })
  if (versionError) throw new Error(versionError.message)

  const { error: updateError } = await supabase
    .from('manual_articles')
    .update({
      content,
      last_edited_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/manual', 'layout')
}
