'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MarkdownRenderer } from '../../../MarkdownRenderer'
import { saveArticleAction } from '../../../actions'

interface Props {
  articleId: string
  articleTitle: string
  initialContent: string
  sectionSlug: string
  articleSlug: string
}

export function ArticleEditClient({
  articleId,
  articleTitle,
  initialContent,
  sectionSlug,
  articleSlug,
}: Props) {
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [changeSummary, setChangeSummary] = useState('')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!changeSummary.trim()) {
      setError('Change summary is required before saving.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await saveArticleAction(articleId, content, changeSummary)
        router.push(`/dashboard/manual/${sectionSlug}/${articleSlug}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Edit: {articleTitle}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Changes are versioned automatically on save.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(v => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              preview
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => router.back()}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !changeSummary.trim()}
            className="bg-gray-900 text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Change Summary <span className="text-red-500">*</span>
            <span className="font-normal text-gray-400 ml-1">— required before saving</span>
          </label>
          <input
            type="text"
            value={changeSummary}
            onChange={e => {
              setChangeSummary(e.target.value)
              setError(null)
            }}
            placeholder="e.g. Updated screening standards to clarify compensation alignment step"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {preview ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 min-h-96">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">Content (Markdown)</label>
              <span className="text-xs text-gray-400">{content.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={28}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y"
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
