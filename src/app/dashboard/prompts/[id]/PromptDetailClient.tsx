'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_STYLES } from '../categoryStyles'

interface Prompt {
  id: string
  name: string
  category: string
  purpose: string
  when_to_use: string
  prompt_text: string
  required_inputs: string | null
  expected_output: string | null
  example_output: string | null
  version: number
  is_active: boolean
}

interface Props {
  prompt: Prompt
  approverName: string | null
  isManager: boolean
}

export function PromptDetailClient({ prompt, approverName, isManager }: Props) {
  const [copied, setCopied] = useState(false)
  const [exampleOpen, setExampleOpen] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(prompt.prompt_text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/prompts" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to Prompt Library
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div className="space-y-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[prompt.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {prompt.category}
            </span>
            <h1 className="text-2xl font-semibold text-gray-900">{prompt.name}</h1>
            <p className="text-sm text-gray-500">{prompt.purpose}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {isManager && (
              <Link
                href={`/dashboard/prompts/${prompt.id}/edit`}
                className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How to use this prompt</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">When to use</p>
            <p className="text-sm text-gray-600">{prompt.when_to_use}</p>
          </div>
          {prompt.required_inputs && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">What you need to provide</p>
              <p className="text-sm text-gray-600">{prompt.required_inputs}</p>
            </div>
          )}
          {prompt.expected_output && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">What Claude will produce</p>
              <p className="text-sm text-gray-600">{prompt.expected_output}</p>
            </div>
          )}
        </div>
      </div>

      {/* Prompt text */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Prompt</h2>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </div>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 overflow-auto max-h-[520px]">
          {prompt.prompt_text}
        </pre>
      </div>

      {/* Example output — collapsible */}
      {prompt.example_output && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExampleOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">Example Output</span>
            <span className="text-gray-400 text-sm">{exampleOpen ? '▲' : '▼'}</span>
          </button>
          {exampleOpen && (
            <div className="px-5 pb-5">
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4">
                {prompt.example_output}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pb-4">
        <span>Version {prompt.version}</span>
        {approverName && <span>Approved by {approverName}</span>}
        {!prompt.is_active && (
          <span className="text-red-500 font-medium">Inactive</span>
        )}
      </div>
    </div>
  )
}
