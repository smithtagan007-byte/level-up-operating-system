'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, CATEGORY_STYLES } from './categoryStyles'
import { createPromptAction, updatePromptAction, type PromptPayload } from './actions'

interface ExistingPrompt {
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
}

interface Props {
  existing?: ExistingPrompt
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none'
const labelClass = 'block text-xs font-medium text-gray-700 mb-1.5'

export function PromptForm({ existing }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState<PromptPayload>({
    name: existing?.name ?? '',
    category: existing?.category ?? CATEGORIES[0],
    purpose: existing?.purpose ?? '',
    when_to_use: existing?.when_to_use ?? '',
    prompt_text: existing?.prompt_text ?? '',
    required_inputs: existing?.required_inputs ?? '',
    expected_output: existing?.expected_output ?? '',
    example_output: existing?.example_output ?? '',
  })

  function set(key: keyof PromptPayload, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!fields.name.trim() || !fields.purpose.trim() || !fields.when_to_use.trim() || !fields.prompt_text.trim()) {
      setError('Name, Purpose, When to Use, and Prompt Text are required.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (existing) {
          await updatePromptAction(existing.id, fields)
          router.push(`/dashboard/prompts/${existing.id}`)
        } else {
          const { id } = await createPromptAction(fields)
          router.push(`/dashboard/prompts/${id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const isNew = !existing

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
      {/* Form */}
      <div className="xl:col-span-3 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Prompt Name *</label>
            <input
              type="text"
              value={fields.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Role Codification"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={fields.category}
              onChange={e => set('category', e.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div />
        </div>

        <div>
          <label className={labelClass}>Purpose * <span className="font-normal text-gray-400">— one sentence on what this prompt produces</span></label>
          <textarea
            rows={2}
            value={fields.purpose}
            onChange={e => set('purpose', e.target.value)}
            placeholder="e.g. Transform a completed role intake into a structured intelligence brief…"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>When to Use * <span className="font-normal text-gray-400">— tell the recruiter exactly when to reach for this</span></label>
          <textarea
            rows={2}
            value={fields.when_to_use}
            onChange={e => set('when_to_use', e.target.value)}
            placeholder="e.g. After role intake is complete, before sourcing begins."
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Prompt Text * <span className="font-normal text-gray-400">— the full prompt the recruiter will paste into Claude</span></label>
          <textarea
            rows={16}
            value={fields.prompt_text}
            onChange={e => set('prompt_text', e.target.value)}
            placeholder="You are a specialist recruitment consultant…"
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div>
          <label className={labelClass}>Required Inputs <span className="font-normal text-gray-400">— what the recruiter must provide</span></label>
          <textarea
            rows={3}
            value={fields.required_inputs}
            onChange={e => set('required_inputs', e.target.value)}
            placeholder="e.g. Role title, must-have criteria, salary range, candidate CV text"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Expected Output <span className="font-normal text-gray-400">— what Claude will produce</span></label>
          <textarea
            rows={3}
            value={fields.expected_output}
            onChange={e => set('expected_output', e.target.value)}
            placeholder="e.g. Tier rating with justification, must-have assessment with evidence…"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Example Output <span className="font-normal text-gray-400">— optional, shown collapsed on the prompt page</span></label>
          <textarea
            rows={6}
            value={fields.example_output}
            onChange={e => set('example_output', e.target.value)}
            placeholder="Paste an example of good output from Claude for this prompt…"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : isNew ? 'Publish Prompt' : `Save Changes (v${(existing?.version ?? 1) + 1})`}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="xl:col-span-2">
        <div className="sticky top-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Card Preview</p>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[fields.category] ?? 'bg-gray-100 text-gray-600'}`}>
                {fields.category}
              </span>
              <span className="text-xs text-gray-400">v{isNew ? 1 : (existing?.version ?? 1) + 1}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{fields.name || <span className="text-gray-300">Prompt name</span>}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">
                {fields.purpose || <span className="text-gray-300">Purpose description</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-2">
              <span className="text-xs font-medium text-gray-900">View prompt →</span>
            </div>
          </div>
          {fields.when_to_use && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-800 mb-1">When to use</p>
              <p className="text-xs text-amber-700">{fields.when_to_use}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
