'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { saveSelfReviewAction, managerReviewAction } from './actions'

interface ExistingReview {
  id: string
  client_communication_score: number | null
  candidate_communication_score: number | null
  pipeline_control_score: number | null
  quality_of_work_score: number | null
  follow_up_discipline_score: number | null
  overall_score: number | null
  what_went_well: string | null
  what_did_not_go_well: string | null
  hot_roles: string | null
  pending_feedback_or_blockers: string | null
  next_week_priorities: string | null
  manager_comments: string | null
  reviewed: boolean
  reviewed_at: string | null
}

interface Props {
  userId: string
  weekStart: string
  weeks: string[]
  existing: ExistingReview | null
  userRole: string
  isViewingOwn: boolean
  targetUserName: string | null
}

const SCORES = [
  { key: 'clientCommunication' as const, label: 'Client Communication' },
  { key: 'candidateCommunication' as const, label: 'Candidate Communication' },
  { key: 'pipelineControl' as const, label: 'Pipeline Control' },
  { key: 'qualityOfWork' as const, label: 'Quality of Work' },
  { key: 'followUpDiscipline' as const, label: 'Follow-Up Discipline' },
]

const REFLECTIONS = [
  { key: 'whatWentWell' as const, label: 'What went well this week?' },
  { key: 'whatDidNotGoWell' as const, label: 'What did not go well this week?' },
  { key: 'hotRoles' as const, label: 'Which roles are currently hot?' },
  { key: 'pendingFeedbackOrBlockers' as const, label: 'Where are you pending feedback or blocked?' },
  { key: 'nextWeekPriorities' as const, label: 'What are your priorities next week?' },
]

function scoreColour(n: number, selected: boolean) {
  if (!selected) return 'bg-gray-100 text-gray-500 hover:bg-gray-200'
  if (n <= 3) return 'bg-red-500 text-white'
  if (n <= 6) return 'bg-yellow-400 text-white'
  if (n <= 8) return 'bg-blue-500 text-white'
  return 'bg-emerald-500 text-white'
}

function overallColour(score: number) {
  if (score <= 3) return 'text-red-600'
  if (score <= 6) return 'text-yellow-600'
  if (score <= 8) return 'text-blue-600'
  return 'text-emerald-600'
}

export function SelfReviewForm({ userId, weekStart, weeks, existing, userRole, isViewingOwn, targetUserName }: Props) {
  const router = useRouter()
  const isManager = ['talent_manager', 'director'].includes(userRole)

  const [scores, setScores] = useState({
    clientCommunication: existing?.client_communication_score ?? null,
    candidateCommunication: existing?.candidate_communication_score ?? null,
    pipelineControl: existing?.pipeline_control_score ?? null,
    qualityOfWork: existing?.quality_of_work_score ?? null,
    followUpDiscipline: existing?.follow_up_discipline_score ?? null,
  })

  const [reflections, setReflections] = useState({
    whatWentWell: existing?.what_went_well ?? '',
    whatDidNotGoWell: existing?.what_did_not_go_well ?? '',
    hotRoles: existing?.hot_roles ?? '',
    pendingFeedbackOrBlockers: existing?.pending_feedback_or_blockers ?? '',
    nextWeekPriorities: existing?.next_week_priorities ?? '',
  })

  const [managerComments, setManagerComments] = useState(existing?.manager_comments ?? '')
  const [markReviewed, setMarkReviewed] = useState(existing?.reviewed ?? false)
  const [saved, setSaved] = useState(false)
  const [managerSaved, setManagerSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isManagerPending, startManagerTransition] = useTransition()

  const overallScore = useMemo(() => {
    const vals = Object.values(scores)
    if (vals.some(v => v === null)) return null
    return (vals as number[]).reduce((sum, v) => sum + v, 0) / 5
  }, [scores])

  const allScoresSet = Object.values(scores).every(v => v !== null)
  const allReflectionsFilled = Object.values(reflections).every(v => v.trim() !== '')
  const isComplete = allScoresSet && allReflectionsFilled

  function handleWeekChange(week: string) {
    const url = `/dashboard/recruiter/self-review?week=${week}${!isViewingOwn ? `&userId=${userId}` : ''}`
    router.push(url)
  }

  function handleSave() {
    if (!isComplete) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await saveSelfReviewAction({
          userId,
          weekStart,
          clientCommunicationScore: scores.clientCommunication!,
          candidateCommunicationScore: scores.candidateCommunication!,
          pipelineControlScore: scores.pipelineControl!,
          qualityOfWorkScore: scores.qualityOfWork!,
          followUpDisciplineScore: scores.followUpDiscipline!,
          whatWentWell: reflections.whatWentWell,
          whatDidNotGoWell: reflections.whatDidNotGoWell,
          hotRoles: reflections.hotRoles,
          pendingFeedbackOrBlockers: reflections.pendingFeedbackOrBlockers,
          nextWeekPriorities: reflections.nextWeekPriorities,
        })
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  function handleManagerSave() {
    setError(null)
    setManagerSaved(false)
    startManagerTransition(async () => {
      try {
        await managerReviewAction(userId, weekStart, managerComments, markReviewed)
        setManagerSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none'
  const readOnlyInputClass = 'w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-600 resize-none'

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isViewingOwn ? 'Weekly Self-Review' : `${targetUserName}'s Self-Review`}
          </h1>
          {!isViewingOwn && (
            <p className="text-xs text-gray-400 mt-0.5">Viewing as manager — recruiter answers are read-only</p>
          )}
        </div>
        <select
          value={weekStart}
          onChange={e => handleWeekChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          {weeks.map(w => (
            <option key={w} value={w}>
              W/C {new Date(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Scorecard */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Scorecard</h2>

        <div className="space-y-1">
          {SCORES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 w-52 shrink-0">{label}</span>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={!isViewingOwn}
                    onClick={() => {
                      setScores(prev => ({ ...prev, [key]: n }))
                      setSaved(false)
                    }}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      !isViewingOwn ? 'opacity-60 cursor-default' : ''
                    } ${scoreColour(n, scores[key] === n)}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">
                {scores[key] !== null ? `${scores[key]}/10` : '—'}
              </span>
            </div>
          ))}

          {/* Overall score */}
          <div className="flex items-center justify-between pt-4 mt-2">
            <span className="text-sm font-semibold text-gray-900 w-52 shrink-0">Overall Score</span>
            <div className="flex-1" />
            <span className={`text-xl font-bold w-10 text-right ${overallScore !== null ? overallColour(overallScore) : 'text-gray-300'}`}>
              {overallScore !== null ? overallScore.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {!allScoresSet && isViewingOwn && (
          <p className="text-xs text-amber-600 mt-4">Complete all 5 scores to submit.</p>
        )}
      </div>

      {/* Reflection */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Reflection</h2>
        <div className="space-y-4">
          {REFLECTIONS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
              <textarea
                rows={3}
                value={reflections[key]}
                readOnly={!isViewingOwn}
                onChange={e => {
                  setReflections(prev => ({ ...prev, [key]: e.target.value }))
                  setSaved(false)
                }}
                className={isViewingOwn ? inputClass : readOnlyInputClass}
                placeholder={isViewingOwn ? 'Write your answer here…' : ''}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recruiter save button */}
      {isViewingOwn && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={!isComplete || isPending}
            className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : existing ? 'Update Self-Review' : 'Save Self-Review'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
          {!isComplete && (
            <span className="text-xs text-gray-400">
              {!allScoresSet ? 'Set all 5 scores' : 'Complete all reflection questions'} to save
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Manager section */}
      {(isManager || (existing?.manager_comments)) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Manager Review</h2>
            {existing?.reviewed && existing.reviewed_at && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Reviewed {new Date(existing.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {isManager ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Manager Comments</label>
                <textarea
                  rows={4}
                  value={managerComments}
                  onChange={e => {
                    setManagerComments(e.target.value)
                    setManagerSaved(false)
                  }}
                  placeholder="Add feedback or coaching notes for the recruiter…"
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markReviewed}
                  onChange={e => {
                    setMarkReviewed(e.target.checked)
                    setManagerSaved(false)
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">Mark as reviewed</span>
              </label>

              {existing ? (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleManagerSave}
                    disabled={isManagerPending}
                    className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    {isManagerPending ? 'Saving…' : 'Save Manager Review'}
                  </button>
                  {managerSaved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Recruiter must submit their self-review before you can add manager comments.</p>
              )}
            </div>
          ) : (
            // Recruiter reading manager comments (read-only)
            existing?.manager_comments && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Manager Comments</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
                  {existing.manager_comments}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
