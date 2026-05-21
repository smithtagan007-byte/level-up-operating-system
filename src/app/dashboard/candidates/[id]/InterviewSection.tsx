'use client'

import { useState } from 'react'
import { scheduleInterviewAction, updateInterviewOutcomeAction } from './actions'

const STAGES = ['1st', '2nd', '3rd', 'final', 'assessment'] as const
const OUTCOMES = [
  { value: 'pass', label: 'Pass', style: 'bg-emerald-100 text-emerald-700' },
  { value: 'reject', label: 'Rejected', style: 'bg-red-100 text-red-700' },
  { value: 'no_show', label: 'No Show', style: 'bg-orange-100 text-orange-700' },
  { value: 'withdrawn', label: 'Withdrawn', style: 'bg-gray-100 text-gray-500' },
] as const

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-amber-100 text-amber-700',
  feedback_pending: 'bg-yellow-100 text-yellow-700',
  passed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Interview {
  id: string
  interview_stage: string
  scheduled_at: string | null
  completed_at: string | null
  status: string
  outcome: string
  feedback: string | null
  interviewer_name: string | null
  created_at: string
}

interface InterviewSectionProps {
  candidateId: string
  roleId: string
  submissionId: string
  interviews: Interview[]
}

export function InterviewSection({ candidateId, roleId, submissionId, interviews }: InterviewSectionProps) {
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedulingPending, setSchedulingPending] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [form, setForm] = useState({ interviewStage: '1st', scheduledAt: '', interviewerName: '' })

  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [outcomeForm, setOutcomeForm] = useState({ status: 'completed', outcome: 'pass', feedback: '' })
  const [outcomePending, setOutcomePending] = useState(false)
  const [outcomeError, setOutcomeError] = useState<string | null>(null)

  async function handleSchedule() {
    if (!form.scheduledAt) { setScheduleError('Please set a date and time'); return }
    setSchedulingPending(true)
    setScheduleError(null)
    try {
      await scheduleInterviewAction({
        candidateId, roleId, submissionId,
        interviewStage: form.interviewStage,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        interviewerName: form.interviewerName || undefined,
      })
      setShowScheduleForm(false)
      setForm({ interviewStage: '1st', scheduledAt: '', interviewerName: '' })
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSchedulingPending(false)
    }
  }

  async function handleOutcome(interviewId: string) {
    setOutcomePending(true)
    setOutcomeError(null)
    try {
      await updateInterviewOutcomeAction({
        interviewId,
        candidateId,
        status: outcomeForm.status,
        outcome: outcomeForm.outcome,
        feedback: outcomeForm.feedback || undefined,
      })
      setLoggingId(null)
      setOutcomeForm({ status: 'completed', outcome: 'pass', feedback: '' })
    } catch (err) {
      setOutcomeError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setOutcomePending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Interviews</h2>
        {!showScheduleForm && (
          <button
            onClick={() => { setShowScheduleForm(true); setLoggingId(null) }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            + Schedule Interview
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {/* Existing interviews */}
        {interviews.length === 0 && !showScheduleForm && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No interviews scheduled yet.</p>
          </div>
        )}

        {interviews.map(iv => (
          <div key={iv.id} className="px-5 py-4">
            {loggingId === iv.id ? (
              /* Log outcome form */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Log Outcome — {iv.interview_stage} Interview
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Result</label>
                    <div className="flex flex-wrap gap-2">
                      {OUTCOMES.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setOutcomeForm(f => ({ ...f, outcome: o.value, status: o.value === 'pass' ? 'passed' : 'rejected' }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            outcomeForm.outcome === o.value
                              ? o.style + ' ring-2 ring-offset-1 ring-gray-400'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Feedback / Notes</label>
                  <textarea
                    value={outcomeForm.feedback}
                    onChange={e => setOutcomeForm(f => ({ ...f, feedback: e.target.value }))}
                    rows={2}
                    placeholder="Interviewer feedback, candidate performance, key observations…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
                  />
                </div>
                {outcomeError && <p className="text-xs text-red-600">{outcomeError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOutcome(iv.id)}
                    disabled={outcomePending}
                    className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {outcomePending ? 'Saving…' : 'Save Outcome'}
                  </button>
                  <button
                    onClick={() => { setLoggingId(null); setOutcomeError(null) }}
                    className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Interview display */
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 capitalize">{iv.interview_stage} Interview</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[iv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {iv.status.replace('_', ' ')}
                    </span>
                    {iv.outcome !== 'pending' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOMES.find(o => o.value === iv.outcome)?.style ?? 'bg-gray-100 text-gray-500'}`}>
                        {OUTCOMES.find(o => o.value === iv.outcome)?.label ?? iv.outcome}
                      </span>
                    )}
                  </div>
                  {iv.scheduled_at && (
                    <p className="text-xs text-gray-400">{fmt(iv.scheduled_at)}</p>
                  )}
                  {iv.interviewer_name && (
                    <p className="text-xs text-gray-500">Interviewer: {iv.interviewer_name}</p>
                  )}
                  {iv.feedback && (
                    <p className="text-xs text-gray-500 italic mt-1">"{iv.feedback}"</p>
                  )}
                </div>
                {iv.outcome === 'pending' && iv.status === 'scheduled' && (
                  <button
                    onClick={() => { setLoggingId(iv.id); setOutcomeForm({ status: 'completed', outcome: 'pass', feedback: '' }) }}
                    className="text-xs text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                  >
                    Log Outcome
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Schedule form */}
        {showScheduleForm && (
          <div className="px-5 py-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Schedule Interview</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                <select
                  value={form.interviewStage}
                  onChange={e => setForm(f => ({ ...f, interviewStage: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} Interview</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Interviewer (optional)</label>
                <input
                  type="text"
                  value={form.interviewerName}
                  onChange={e => setForm(f => ({ ...f, interviewerName: e.target.value }))}
                  placeholder="e.g. Sarah Johnson, Head of Engineering"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
            </div>
            {scheduleError && <p className="text-xs text-red-600 mt-2">{scheduleError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSchedule}
                disabled={schedulingPending}
                className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {schedulingPending ? 'Scheduling…' : 'Confirm Interview'}
              </button>
              <button
                onClick={() => { setShowScheduleForm(false); setScheduleError(null) }}
                className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
