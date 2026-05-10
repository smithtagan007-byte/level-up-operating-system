'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveScreeningAction, type ScreeningData } from './actions'

interface Field {
  key: keyof ScreeningData
  label: string
  hint?: string
  type?: 'textarea' | 'select' | 'text'
  options?: string[]
  highlight?: boolean
}

const FIELDS: Field[] = [
  { key: 'motivation', label: 'Motivation', hint: 'What drives this candidate? Why are they looking?', type: 'textarea' },
  { key: 'reason_for_leaving', label: 'Reason for Leaving', hint: 'Current/most recent role — honest reason, not rehearsed answer.', type: 'textarea' },
  { key: 'growth_drivers', label: 'Growth Drivers', hint: 'What does career progression look like for them?', type: 'textarea' },
  { key: 'pain_points', label: 'Pain Points', hint: 'What are they running away from? Frustrations in current role.', type: 'textarea' },
  { key: 'notice_period', label: 'Notice Period', hint: 'Contractual vs. negotiable.', type: 'text' },
  { key: 'competing_interviews', label: 'Competing Interviews', hint: 'Other processes they are in. Stage and timeline.', type: 'textarea' },
  {
    key: 'counteroffer_risk',
    label: 'Counteroffer Risk',
    hint: 'How likely is a counteroffer and would they take it?',
    type: 'select',
    options: ['Low', 'Medium', 'High'],
  },
  { key: 'career_goals', label: 'Career Goals', hint: '12-month and 3-year ambitions.', type: 'textarea' },
  { key: 'communication_quality', label: 'Communication Quality', hint: 'Tone, clarity, engagement, preparation. Your honest assessment.', type: 'textarea' },
  { key: 'recruiter_concerns', label: 'Recruiter Concerns', hint: 'Anything that gave you pause — flag it here, do not omit.', type: 'textarea' },
  {
    key: 'leverage_points',
    label: 'Leverage Points for Offer Stage',
    hint: 'The most important field. What can we use at offer stage to close this candidate? Specific motivators, fears, priorities.',
    type: 'textarea',
    highlight: true,
  },
]

interface ScreeningFormProps {
  candidateId: string
  existing?: Partial<ScreeningData>
}

export function ScreeningForm({ candidateId, existing }: ScreeningFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<Partial<ScreeningData>>(existing ?? {})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function set(key: keyof ScreeningData, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function validate(): string | null {
    const missing = FIELDS.filter(f => !values[f.key]?.toString().trim())
    if (missing.length > 0) return `Please complete: ${missing.map(f => f.label).join(', ')}`
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setPending(true)
    setError(null)
    try {
      await saveScreeningAction(candidateId, values as ScreeningData)
      router.push(`/dashboard/candidates/${candidateId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPending(false)
    }
  }

  const completedCount = FIELDS.filter(f => values[f.key]?.toString().trim()).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Fields completed</span>
        <span className={`text-sm font-semibold ${completedCount === FIELDS.length ? 'text-emerald-600' : 'text-gray-500'}`}>
          {completedCount}/{FIELDS.length}
        </span>
      </div>

      {FIELDS.map((field) => (
        <div
          key={field.key}
          className={`bg-white border rounded-xl p-5 ${field.highlight ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}
        >
          <label className="block text-sm font-semibold text-gray-900 mb-0.5">
            {field.label}
            {field.highlight && <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Key Field</span>}
            <span className="text-red-500 ml-1">*</span>
          </label>
          {field.hint && <p className="text-xs text-gray-400 mb-3">{field.hint}</p>}

          {field.type === 'select' ? (
            <div className="flex gap-2">
              {field.options!.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set(field.key, opt)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    values[field.key] === opt
                      ? opt === 'Low' ? 'border-green-500 bg-green-50 text-green-800'
                      : opt === 'Medium' ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                      : 'border-red-500 bg-red-50 text-red-800'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : field.type === 'text' ? (
            <input
              type="text"
              value={values[field.key] ?? ''}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={field.key === 'notice_period' ? 'e.g. 4 weeks — negotiable' : ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          ) : (
            <textarea
              value={values[field.key] ?? ''}
              onChange={(e) => set(field.key, e.target.value)}
              rows={field.highlight ? 5 : 3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          )}
        </div>
      ))}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pb-8">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/candidates/${candidateId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save Screening'}
        </button>
      </div>
    </form>
  )
}
