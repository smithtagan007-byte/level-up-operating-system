import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArticleEditClient } from './ArticleEditClient'

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ sectionSlug: string; articleSlug: string }>
}) {
  const { sectionSlug, articleSlug } = await params
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
    .select('manual_articles(id, title, slug, content)')
    .eq('slug', sectionSlug)
    .single()

  if (!section) notFound()

  const articles = (Array.isArray((section as any).manual_articles)
    ? (section as any).manual_articles
    : [(section as any).manual_articles]
  ).filter(Boolean) as { id: string; title: string; slug: string; content: string }[]

  const article = articles.find(a => a.slug === articleSlug)
  if (!article) notFound()

  return (
    <ArticleEditClient
      articleId={article.id}
      articleTitle={article.title}
      initialContent={article.content}
      sectionSlug={sectionSlug}
      articleSlug={articleSlug}
    />
  )
}
