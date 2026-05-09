import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MarkdownRenderer } from '../../../MarkdownRenderer'

export default async function ArticleHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionSlug: string; articleSlug: string }>
  searchParams: Promise<{ version?: string }>
}) {
  const { sectionSlug, articleSlug } = await params
  const { version: versionId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['talent_manager', 'director'].includes(profile.role)) {
    redirect(`/dashboard/manual/${sectionSlug}/${articleSlug}`)
  }

  const { data: section } = await supabase
    .from('manual_sections')
    .select('manual_articles(id, title, slug)')
    .eq('slug', sectionSlug)
    .single()

  if (!section) notFound()

  const articles = (Array.isArray((section as any).manual_articles)
    ? (section as any).manual_articles
    : [(section as any).manual_articles]
  ).filter(Boolean) as { id: string; title: string; slug: string }[]

  const article = articles.find(a => a.slug === articleSlug)
  if (!article) notFound()

  const { data: versions } = await supabase
    .from('manual_article_versions')
    .select('id, previous_content, new_content, change_summary, created_at, changed_by')
    .eq('article_id', article.id)
    .order('created_at', { ascending: false })

  // Fetch editor names
  const editorIds = [...new Set((versions ?? []).map(v => v.changed_by).filter(Boolean))]
  const editorMap: Record<string, string> = {}
  if (editorIds.length > 0) {
    const { data: editors } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', editorIds)
    for (const e of editors ?? []) editorMap[e.id] = e.full_name
  }

  const viewingVersion = versionId
    ? (versions ?? []).find(v => v.id === versionId)
    : null

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/manual" className="hover:text-gray-700 transition-colors">Operating Manual</Link>
        <span>›</span>
        <Link href={`/dashboard/manual/${sectionSlug}/${articleSlug}`} className="hover:text-gray-700 transition-colors">
          {article.title}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Version History</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Version History</h1>
        <Link
          href={`/dashboard/manual/${sectionSlug}/${articleSlug}`}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back to article
        </Link>
      </div>

      {!versions || versions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">No version history yet. Versions are saved when the article is edited.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map(v => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {v.change_summary ?? 'No summary provided'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.changed_by ? editorMap[v.changed_by] ?? 'Unknown' : 'Unknown'}
                    {' · '}
                    {new Date(v.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' at '}
                    {new Date(v.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Link
                  href={`/dashboard/manual/${sectionSlug}/${articleSlug}/history?version=${v.id}`}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors shrink-0 ml-4"
                >
                  View
                </Link>
              </div>

              {viewingVersion?.id === v.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Content saved in this version
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MarkdownRenderer content={v.new_content} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
