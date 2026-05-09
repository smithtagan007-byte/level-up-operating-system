'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES, CATEGORY_STYLES } from './categoryStyles'
import { deactivatePromptAction } from './actions'

interface Prompt {
  id: string
  name: string
  category: string
  purpose: string
  version: number
  is_active: boolean
}

interface Props {
  prompts: Prompt[]
  isManager: boolean
}

export function PromptLibraryClient({ prompts, isManager }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isPending, startTransition] = useTransition()
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return prompts.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.purpose.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [prompts, search, activeCategory])

  const presentCategories = useMemo(() => {
    const cats = new Set(prompts.map(p => p.category))
    return CATEGORIES.filter(c => cats.has(c))
  }, [prompts])

  function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? It will no longer be visible to the team.`)) return
    setDeactivatingId(id)
    startTransition(async () => {
      await deactivatePromptAction(id)
      setDeactivatingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search prompts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <div className="flex-1" />
        {isManager && (
          <Link
            href="/dashboard/prompts/new"
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Add Prompt
          </Link>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveCategory('All')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'All'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({prompts.length})
        </button>
        {presentCategories.map(cat => {
          const count = prompts.filter(p => p.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No prompts match your search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(prompt => (
            <div
              key={prompt.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[prompt.category] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {prompt.category}
                </span>
                <span className="text-xs text-gray-400 shrink-0">v{prompt.version}</span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">{prompt.name}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{prompt.purpose}</p>
              </div>

              <div className="flex items-center gap-2 mt-auto pt-1">
                <Link
                  href={`/dashboard/prompts/${prompt.id}`}
                  className="text-xs font-medium text-gray-900 hover:text-gray-600 transition-colors"
                >
                  View prompt →
                </Link>
                {isManager && (
                  <>
                    <span className="text-gray-200">|</span>
                    <Link
                      href={`/dashboard/prompts/${prompt.id}/edit`}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => handleDeactivate(prompt.id, prompt.name)}
                      disabled={isPending && deactivatingId === prompt.id}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {deactivatingId === prompt.id ? 'Deactivating…' : 'Deactivate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
