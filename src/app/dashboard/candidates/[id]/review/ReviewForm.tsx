'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreInput } from '@/components/ui/ScoreInput'
import { saveReviewAction, type ReviewData } from './actions'
import type { CandidateTier } from '@/types'

const SCORE_FIELDS: { key: keyof ReviewData; label: string }[] = [
  { key: 'industry_fit', label: 'Industry Fit' },
  { key: 'technical_fit', label: 'Technical Fit' },
  { key: 'contextual_skill', label: 'Contextual Skill' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'communication', label: 'Communication' },
  { key: 'stability', label: 'Stability' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'salary_alignment', label: 'Salary Alignment' },
  { key: 'location_alignment', label: 'Location Alignment' },
  { key: 'culture_fit', label: 'Culture Fit' },
  { key: 'risk_score', label: 'Risk' },
]

const TIERS: { value: CandidateTier; label: string; style: string }[] = [
  { value: 'A', label: 'A — Exceptional', style: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { value: 'B', label: 'B — Strong', style: 'border-green-500 bg-green-50 text-green-800' },
  { value: 'C', label: 'C — Viable', style: 'border-yellow-500 bg-yellow-50 text-yellow-800' },
  { value: 'D', label: 'D — Weak', style: 'border-orange-500 bg-orange-50 text-orange-800' },
  { value: 'Reject', label: 'Reject', style: 'border-red-500 bg-red-50 text-red-800' },
]

interface ReviewFormProps {
  candidateId: string
  candidateName: string
  existing?: Partial<ReviewData>
}

export function ReviewForm({ candidateId, candidateName, existing }: ReviewFormProps) {
  const router = useRouter()
  const [scores, setScores] = useState<Partial<Record<keyof ReviewData, number>>>(
    existing
      ? Object.fromEntries(SCORE_FIELDS.map(f => [f.key, (existing as Record<string, unknown>)[f.key] as number]).filter(([, v]) => v !== undefined))
      : {}
  )
  const [tier, setTier] = useState<CandidateTier | null>(existing?.tier ?? null)
  const [evidenceNotes, setEvidenceNotes] = useState(existing?.evidence_notes ?? '')
  const [riskNotes, setRiskNotes] = useState(existing?.risk_notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function validate(): string | null {
    const missingScores = SCORE_FIELDS.filter(f => scores[f.key] === undefined)
    if (missingScores.length > 0) return `Please score: ${missingScores.map(f => f.label).join(', ')}`
    if (!tier) return 'Please select an overall tier'
    if (!evidenceNotes.trim()) return 'Evidence notes are required'
    if (!riskNotes.trim()) return 'Risk notes are required'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setPending(true)
    setError(null)
    try {
      await saveReviewAction(candidateId, {
        ...scores as Record<keyof ReviewData, number>,
        tier: tier!,
        evidence_notes: evidenceNotes.trim(),
        risk_notes: riskNotes.trim(),
      })
      router.push(`/dashboard/candidates/${candidateId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPending(false)
    }
  }

  const completedScores = SCORE_FIELDS.filter(f => scores[f.key] !== undefined).length

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Progress indicator */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Scores completed</span>
        <span className={`text-sm font-semibold ${completedScores === 11 ? 'text-emerald-600' : 'text-gray-500'}`}>
          {completedScores}/11
        </span>
      </div>

      {/* Score fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Assessment Scores</h2>
        {SCORE_FIELDS.map((field) => (
          <ScoreInput
            key={field.key}
            name={field.key}
            label={field.label}
            defaultValue={existing ? (existing as Record<string, unknown>)[field.key] as number | undefined : undefined}
            onChange={(v) => setScores(prev => ({ ...prev, [field.key]: v }))}
          />
        ))}
      </div>

      {/* Tier selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Overall Tier</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TIERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTier(t.value)}
              className={`px-3 py-2.5 rounded-lg text-xs font-semibold border-2 text-center transition-colors ${
                tier === t.value ? t.style : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Notes</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Evidence Notes <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Documented evidence supporting your scores and tier decision.</p>
          <textarea
            value={evidenceNotes}
            onChange={(e) => setEvidenceNotes(e.target.value)}
            rows={4}
            placeholder="e.g. 8 years in SaaS sales, exceeded quota 5/6 quarters, specific examples of..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Risk Notes <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Specific risks identified and how they were assessed.</p>
          <textarea
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Job hopping pattern — 3 roles in 4 years. Explained as company restructures. Verified via LinkedIn..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
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
          {pending ? 'Saving…' : 'Save Review'}
        </button>
      </div>
    </form>
  )
}
