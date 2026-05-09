import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MarkdownRenderer } from '../../MarkdownRenderer'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ sectionSlug: string; articleSlug: string }>
}) {
  const { sectionSlug, articleSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: section }, { data: profile }] = await Promise.all([
    supabase
      .from('manual_sections')
      .select(`
        id, title, slug,
        manual_articles (
          id, article_number, title, slug, content, updated_at, last_edited_by
        )
      `)
      .eq('slug', sectionSlug)
      .single(),
    supabase.from('user_profiles').select('role').eq('id', user.id).single(),
  ])

  if (!section) notFound()

  const articles = (Array.isArray((section as any).manual_articles)
    ? (section as any).manual_articles
    : [(section as any).manual_articles]
  ).filter(Boolean) as {
    id: string
    article_number: string
    title: string
    slug: string
    content: string
    updated_at: string
    last_edited_by: string | null
  }[]

  const article = articles.find(a => a.slug === articleSlug)
  if (!article) notFound()

  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  // fetch editor name if available
  let editorName: string | null = null
  if (article.last_edited_by) {
    const { data: editor } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', article.last_edited_by)
      .single()
    editorName = editor?.full_name ?? null
  }

  // prev / next navigation — fetch all articles across all sections
  const { data: allSections } = await supabase
    .from('manual_sections')
    .select('slug, manual_articles(slug, article_number, title)')
    .order('section_number')
    .order('article_number', { referencedTable: 'manual_articles' })

  const allLinks: { sectionSlug: string; articleSlug: string; articleNumber: string; title: string }[] = []
  for (const s of allSections ?? []) {
    const arts = Array.isArray((s as any).manual_articles)
      ? (s as any).manual_articles
      : [(s as any).manual_articles]
    for (const a of arts.filter(Boolean)) {
      allLinks.push({ sectionSlug: s.slug, articleSlug: a.slug, articleNumber: a.article_number, title: a.title })
    }
  }

  const currentIdx = allLinks.findIndex(
    l => l.sectionSlug === sectionSlug && l.articleSlug === articleSlug
  )
  const prevLink = currentIdx > 0 ? allLinks[currentIdx - 1] : null
  const nextLink = currentIdx >= 0 && currentIdx < allLinks.length - 1 ? allLinks[currentIdx + 1] : null

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/manual" className="hover:text-gray-700 transition-colors">
          Operating Manual
        </Link>
        <span>›</span>
        <span className="text-gray-600">{section.title}</span>
        <span>›</span>
        <span className="text-gray-900 font-medium">{article.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{article.article_number}</p>
          <h1 className="text-xl font-semibold text-gray-900">{article.title}</h1>
        </div>
        {isManager && (
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Link
              href={`/dashboard/manual/${sectionSlug}/${articleSlug}/history`}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              History
            </Link>
            <Link
              href={`/dashboard/manual/${sectionSlug}/${articleSlug}/edit`}
              className="text-xs font-medium border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <MarkdownRenderer content={article.content} />
      </div>

      {/* Meta */}
      {(editorName || article.updated_at) && (
        <p className="text-xs text-gray-400 mt-4">
          {editorName ? `Last edited by ${editorName}` : 'Last updated'}
          {article.updated_at
            ? ` · ${new Date(article.updated_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`
            : ''}
        </p>
      )}

      {/* Prev / Next */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 gap-4">
        <div className="flex-1">
          {prevLink && (
            <Link
              href={`/dashboard/manual/${prevLink.sectionSlug}/${prevLink.articleSlug}`}
              className="group flex flex-col gap-0.5 hover:text-gray-900 transition-colors"
            >
              <span className="text-xs text-gray-400">← {prevLink.articleNumber}</span>
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{prevLink.title}</span>
            </Link>
          )}
        </div>
        <div className="flex-1 text-right">
          {nextLink && (
            <Link
              href={`/dashboard/manual/${nextLink.sectionSlug}/${nextLink.articleSlug}`}
              className="group flex flex-col gap-0.5 items-end hover:text-gray-900 transition-colors"
            >
              <span className="text-xs text-gray-400">{nextLink.articleNumber} →</span>
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{nextLink.title}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
