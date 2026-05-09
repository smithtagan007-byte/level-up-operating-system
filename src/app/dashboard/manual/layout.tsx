import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManualSidebar } from './ManualSidebar'
import type { ReactNode } from 'react'

export default async function ManualLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sections } = await supabase
    .from('manual_sections')
    .select(`
      id,
      section_number,
      title,
      slug,
      manual_articles (
        id,
        article_number,
        title,
        slug
      )
    `)
    .order('section_number')
    .order('article_number', { referencedTable: 'manual_articles' })

  return (
    <div className="flex gap-8 min-h-screen">
      <ManualSidebar sections={(sections ?? []) as any} />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
