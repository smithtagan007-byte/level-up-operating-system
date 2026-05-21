'use client'

import { useState } from 'react'
import { createSubmissionAction, updateSubmissionFeedbackAction } from './actions'

const FEEDBACK_OPTIONS = [
  { value: 'submitted', label: 'Submitted', style: 'bg-gray-100 text-gray-600' },
  { value: 'viewed', label: 'Viewed', style: 'bg-blue-100 text-blue-700' },
  { value: 'shortlisted', label: 'Shortlisted', style: 'bg-indigo-100 text-indigo-700' },
  { value: 'interview_requested', label: 'Interview Requested', style: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', style: 'bg-red-100 text-red-700' },
  { value: 'on_hold', label: 'On Hold', style: 'bg-amber-100 text-amber-700' },
  { value: 'withdrawn', label: 'Withdrawn', style: 'bg-gray-100 text-gray-400' },
] as const

function FeedbackBadge({ status }: { status: string }) {
  const opt = FEEDBACK_OPTIONS.find(o => o.value === status) ?? FEEDBACK_OPTIONS[0]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opt.style}`}>
      {opt.label}
    </span>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Submission {
  id: string
  version: number
  submitted_at: string
  submission_note: string | null
  client_feedback: string | null
  feedback_status: string
  is_latest: boolean
  submitted_by_name: string | null
}

interface SubmissionSectionProps {
  candidateId: string
  roleId: string
  clientId: string
  roleTitle: string
  candidateName: string
  isApproved: boolean
  submissions: Submission[]
}

export function SubmissionSection({
  candidateId, roleId, clientId, roleTitle, candidateName, isApproved, submissions,
}: SubmissionSectionProps) {
  const latest = submissions.find(s => s.is_latest) ?? submissions[0] ?? null
  const history = submissions.filter(s => !s.is_latest)

  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submissionNote, setSubmissionNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Feedback update state
  const [updatingFeedback, setUpdatingFeedback] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState(latest?.feedback_status ?? 'submitted')
  const [clientFeedback, setClientFeedback] = useState(latest?.client_feedback ?? '')
  const [feedbackPending, setFeedbackPending] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // History expand
  const [showHistory, setShowHistory] = useState(false)

  async function handleSubmit() {
    setPending(true)
    setError(null)
    try {
      await createSubmissionAction(candidateId, roleId, clientId, roleTitle, submissionNote || undefined)
      setShowSubmitForm(false)
      setSubmissionNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  async function handleFeedbackSave() {
    if (!latest) return
    setFeedbackPending(true)
    setFeedbackError(null)
    try {
      await updateSubmissionFeedbackAction(latest.id, candidateId, feedbackStatus, clientFeedback || undefined)
      setUpdatingFeedback(false)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setFeedbackPending(false)
    }
  }

  // Not approved and no submissions — nothing to show
  if (!isApproved && submissions.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Client Submission</h2>
        {latest && (
          <button
            onClick={() => { setShowSubmitForm(v => !v); setError(null) }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {showSubmitForm ? 'Cancel' : `Resubmit (v${latest.version + 1})`}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* No submissions yet — approved candidate */}
        {submissions.length === 0 && isApproved && !showSubmitForm && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Approved — ready to submit to client.</p>
            <button
              onClick={() => setShowSubmitForm(true)}
              className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Submit to Client
            </button>
          </div>
        )}

        {/* Submit / Resubmit form */}
        {showSubmitForm && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {latest ? `Version ${latest.version + 1} — Resubmission` : 'First Submission'}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Submission Note (optional)</label>
              <textarea
                value={submissionNote}
                onChange={e => setSubmissionNote(e.target.value)}
                rows={2}
                placeholder="What changed? Why resubmitting? Any tailoring notes…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={pending}
                className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {pending ? 'Submitting…' : `Confirm ${latest ? 'Resubmission' : 'Submission'}`}
              </button>
              <button
                onClick={() => { setShowSubmitForm(false); setError(null) }}
                className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Latest submission card */}
        {latest && !showSubmitForm && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FeedbackBadge status={latest.feedback_status} />
                  <span className="text-xs text-gray-400">
                    v{latest.version} · {fmt(latest.submitted_at)}
                    {latest.submitted_by_name ? ` · ${latest.submitted_by_name}` : ''}
                  </span>
                </div>
                {latest.submission_note && (
                  <p className="text-xs text-gray-500 italic">"{latest.submission_note}"</p>
                )}
                {latest.client_feedback && (
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-medium text-gray-500">Client: </span>
                    {latest.client_feedback}
                  </p>
                )}
              </div>
              {!updatingFeedback && (
                <button
                  onClick={() => { setUpdatingFeedback(true); setFeedbackStatus(latest.feedback_status); setClientFeedback(latest.client_feedback ?? '') }}
                  className="text-xs text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                >
                  Update Feedback
                </button>
              )}
            </div>

            {/* Feedback update form */}
            {updatingFeedback && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Feedback</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFeedbackStatus(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          feedbackStatus === opt.value
                            ? opt.style + ' ring-2 ring-offset-1 ring-gray-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Notes</label>
                  <textarea
                    value={clientFeedback}
                    onChange={e => setClientFeedback(e.target.value)}
                    rows={2}
                    placeholder="Verbatim client feedback…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
                  />
                </div>
                {feedbackError && <p className="text-xs text-red-600">{feedbackError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleFeedbackSave}
                    disabled={feedbackPending}
                    className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {feedbackPending ? 'Saving…' : 'Save Feedback'}
                  </button>
                  <button
                    onClick={() => { setUpdatingFeedback(false); setFeedbackError(null) }}
                    className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous versions */}
        {history.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showHistory ? '▲ Hide' : '▼ Show'} {history.length} previous version{history.length !== 1 ? 's' : ''}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-100">
                {history.map(s => (
                  <div key={s.id} className="text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <FeedbackBadge status={s.feedback_status} />
                      <span>v{s.version} · {fmt(s.submitted_at)}</span>
                    </div>
                    {s.submission_note && <p className="mt-0.5 italic">"{s.submission_note}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
