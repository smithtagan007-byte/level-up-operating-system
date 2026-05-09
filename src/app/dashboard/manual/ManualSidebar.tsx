'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Article {
  id: string
  article_number: string
  title: string
  slug: string
}

interface Section {
  id: string
  section_number: number
  title: string
  slug: string
  manual_articles: Article[]
}

interface Props {
  sections: Section[]
}

export function ManualSidebar({ sections }: Props) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return sections
    return sections
      .map(s => ({
        ...s,
        manual_articles: s.manual_articles.filter(
          a => a.title.toLowerCase().includes(q) || a.article_number.includes(q)
        ),
      }))
      .filter(s => s.manual_articles.length > 0 || s.title.toLowerCase().includes(q))
  }, [sections, search])

  function toggleSection(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 -ml-0 pr-4">
      <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <input
          type="text"
          placeholder="Search manual…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
        />
        <nav className="space-y-0.5">
          {filtered.map(section => {
            const isOpen = !collapsed.has(section.id)
            const hasActive = section.manual_articles.some(
              a => pathname === `/dashboard/manual/${section.slug}/${a.slug}`
            )
            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors group ${
                    hasActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {section.section_number}. {section.title}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-300">{section.manual_articles.length}</span>
                    <span className="text-gray-300 text-xs">{isOpen ? '▾' : '▸'}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="ml-3 mb-1 space-y-0.5">
                    {section.manual_articles.map(article => {
                      const href = `/dashboard/manual/${section.slug}/${article.slug}`
                      const isActive = pathname === href
                      return (
                        <Link
                          key={article.id}
                          href={href}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                            isActive
                              ? 'bg-gray-900 text-white font-medium'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`shrink-0 mt-0.5 ${isActive ? 'text-gray-400' : 'text-gray-300'}`}>
                            {article.article_number}
                          </span>
                          <span className="leading-snug">{article.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
