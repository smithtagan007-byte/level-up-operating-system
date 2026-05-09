import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ManualHomePage() {
  const supabase = await createClient()

  const { data: first } = await supabase
    .from('manual_sections')
    .select(`
      slug,
      manual_articles ( slug )
    `)
    .order('section_number')
    .limit(1)
    .single()

  const articles = (first as any)?.manual_articles
  const firstArticle = Array.isArray(articles) ? articles[0] : articles

  if (first?.slug && firstArticle?.slug) {
    redirect(`/dashboard/manual/${first.slug}/${firstArticle.slug}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900">Operating Manual</h1>
      <p className="text-sm text-gray-500 mt-2">
        No articles found. Run the manual schema SQL to seed content.
      </p>
    </div>
  )
}
