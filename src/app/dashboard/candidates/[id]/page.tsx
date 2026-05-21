import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { SubmitReviewButton } from './SubmitReviewButton'
import { EditCandidateNameButton } from './EditCandidateNameButton'
import { AssignSpecialistButton } from './AssignSpecialistButton'
import { SubmissionSection } from './SubmissionSection'
import { InterviewSection } from './InterviewSection'
import { OfferSection } from './OfferSection'
import { notFound } from 'next/navigation'
import type { CandidateTier, RiskLevel } from '@/types'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

const finalStatusConfig = {
  pending: { label: 'Awaiting Review', style: 'bg-gray-100 text-gray-600' },
  approved_for_formatting: { label: 'Approved for Formatting', style: 'bg-emerald-100 text-emerald-800' },
  rework: { label: 'Rework Required', style: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'Rejected', style: 'bg-red-100 text-red-800' },
}

const decisionStyles: Record<string, { label: string; dot: string; text: string }> = {
  approved: { label: 'Approved', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  rejected: { label: 'Rejected', dot: 'bg-red-500', text: 'text-red-700' },
  rework: { label: 'Rework', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  pending: { label: 'Pending', dot: 'bg-gray-300', text: 'text-gray-400' },
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CandidateDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: candidate },
    { data: review },
    { data: screening },
    { data: internalReview },
    { data: recruiters },
    { data: submissionsRaw },
    { data: interviews },
    { data: offers },
  ] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, tier, risk_level, submitted_to_client, role_id, created_at, current_title, current_company, assigned_to, roles(title, status, client_id, clients(name))')
      .eq('id', id)
      .single(),
    supabase
      .from('candidate_reviews')
      .select('id, tier, updated_at')
      .eq('candidate_id', id)
      .maybeSingle(),
    supabase
      .from('candidate_screenings')
      .select('id, updated_at')
      .eq('candidate_id', id)
      .maybeSingle(),
    supabase
      .from('internal_reviews')
      .select('id, final_status, client_owner_status, talent_manager_status, created_at')
      .eq('candidate_id', id)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('role', ['talent_specialist', 'talent_manager', 'director'])
      .order('full_name'),
    supabase
      .from('candidate_submissions')
      .select('id, version, submitted_at, submitted_by, submission_note, client_feedback, feedback_status, is_latest, user_profiles(full_name)')
      .eq('candidate_id', id)
      .order('version', { ascending: false }),
    supabase
      .from('candidate_interviews')
      .select('id, interview_stage, scheduled_at, completed_at, status, outcome, feedback, interviewer_name, created_at')
      .eq('candidate_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('offers')
      .select('id, offered_salary, start_date, notice_period_days, counter_offered, status, accepted_at, declined_at, declined_reason, replacement_risk, created_at')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!candidate) notFound()

  const roleRaw = (Array.isArray(candidate.roles) ? candidate.roles[0] : candidate.roles) as { title: string; status: string; client_id: string; clients: unknown } | null
  const role = roleRaw ? { title: roleRaw.title, status: roleRaw.status, client_id: roleRaw.client_id, clients: roleRaw.clients } : null
  const roleStatus = role?.status ?? null
  const clientName = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null

  const assignedTo = (candidate as { assigned_to?: string | null }).assigned_to ?? null
  const assignedToName = assignedTo ? ((recruiters ?? []).find(u => u.id === assignedTo)?.full_name ?? null) : null

  // Normalize submissions with submitted_by_name
  const submissions = (submissionsRaw ?? []).map(s => {
    const profileRaw = (s as { user_profiles: unknown }).user_profiles
    const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { full_name: string } | null
    return {
      id: s.id,
      version: s.version,
      submitted_at: s.submitted_at,
      submission_note: s.submission_note,
      client_feedback: s.client_feedback,
      feedback_status: s.feedback_status,
      is_latest: s.is_latest,
      submitted_by_name: profile?.full_name ?? null,
    }
  })

  const latestSubmission = submissions.find(s => s.is_latest) ?? null

  const bothComplete = !!review && !!screening
  const inReview = !!internalReview
  const isApproved = internalReview?.final_status === 'approved_for_formatting'
  const alreadySubmitted = !!candidate.submitted_to_client

  // Activity timeline
  type TimelineEvent = {
    key: string
    label: string
    date?: string
    status: 'done' | 'pending' | 'blocked' | 'decision_good' | 'decision_warn' | 'decision_bad'
    detail?: string
  }

  const timeline: TimelineEvent[] = [
    {
      key: 'added',
      label: 'Added to pipeline',
      date: candidate.created_at,
      status: 'done',
      detail: role ? `${role.title}${clientName ? ` · ${clientName.name}` : ''}` : undefined,
    },
    {
      key: 'review',
      label: 'Review Scorecard',
      date: review?.updated_at,
      status: review ? 'done' : 'pending',
      detail: review ? `Tier: ${review.tier ?? '—'}` : 'Not started',
    },
    {
      key: 'screening',
      label: 'Screening Intelligence',
      date: screening?.updated_at,
      status: screening ? 'done' : 'pending',
      detail: screening ? undefined : 'Not started',
    },
    {
      key: 'internal',
      label: 'Internal Review submitted',
      date: internalReview?.created_at,
      status: internalReview ? 'done' : bothComplete ? 'pending' : 'blocked',
      detail: internalReview ? undefined : bothComplete ? 'Ready to submit' : 'Complete scorecard & screening first',
    },
  ]

  if (internalReview) {
    const coStatus = internalReview.client_owner_status ?? 'pending'
    const tmStatus = internalReview.talent_manager_status ?? 'pending'
    const coStyle = decisionStyles[coStatus] ?? decisionStyles.pending
    const tmStyle = decisionStyles[tmStatus] ?? decisionStyles.pending

    timeline.push({
      key: 'co_decision',
      label: 'Client Owner decision',
      status: coStatus === 'approved' ? 'decision_good' : coStatus === 'pending' ? 'pending' : coStatus === 'rework' ? 'decision_warn' : 'decision_bad',
      detail: coStyle.label,
    })
    timeline.push({
      key: 'tm_decision',
      label: 'Talent Manager decision',
      status: tmStatus === 'approved' ? 'decision_good' : tmStatus === 'pending' ? 'pending' : tmStatus === 'rework' ? 'decision_warn' : 'decision_bad',
      detail: tmStyle.label,
    })
  }

  if (latestSubmission) {
    const FEEDBACK_LABELS: Record<string, string> = {
      submitted: 'Submitted', viewed: 'Viewed', shortlisted: 'Shortlisted',
      interview_requested: 'Interview Requested', rejected: 'Rejected',
      on_hold: 'On Hold', withdrawn: 'Withdrawn',
    }
    const feedbackLabel = FEEDBACK_LABELS[latestSubmission.feedback_status] ?? latestSubmission.feedback_status

    timeline.push({
      key: 'submitted',
      label: 'Submitted to client',
      date: latestSubmission.submitted_at,
      status: 'done',
      detail: `v${latestSubmission.version} · ${feedbackLabel}`,
    })
  }

  if ((interviews ?? []).length > 0) {
    const passedCount = (interviews ?? []).filter(i => i.outcome === 'pass').length
    const latestInterview = (interviews ?? []).at(-1)
    timeline.push({
      key: 'interviewing',
      label: `Interviewing (${(interviews ?? []).length} scheduled${passedCount > 0 ? `, ${passedCount} passed` : ''})`,
      date: latestInterview?.scheduled_at ?? undefined,
      status: 'done',
    })
  }

  const activeOffer = (offers ?? []).find(o => o.status === 'pending') ?? (offers ?? [])[0] ?? null
  if (activeOffer) {
    timeline.push({
      key: 'offer',
      label: 'Offer made',
      date: activeOffer.created_at,
      status: activeOffer.status === 'accepted' ? 'decision_good' : activeOffer.status === 'declined' ? 'decision_bad' : 'done',
      detail: activeOffer.status === 'accepted' ? 'Accepted' : activeOffer.status === 'declined' ? 'Declined' : 'Pending response',
    })
  }

  const dotClass: Record<TimelineEvent['status'], string> = {
    done: 'bg-emerald-500 border-emerald-500',
    pending: 'bg-white border-gray-300',
    blocked: 'bg-white border-gray-200',
    decision_good: 'bg-emerald-500 border-emerald-500',
    decision_warn: 'bg-yellow-400 border-yellow-400',
    decision_bad: 'bg-red-500 border-red-500',
  }

  const labelClass: Record<TimelineEvent['status'], string> = {
    done: 'text-gray-900 font-medium',
    pending: 'text-gray-500',
    blocked: 'text-gray-300',
    decision_good: 'text-gray-900 font-medium',
    decision_warn: 'text-gray-900 font-medium',
    decision_bad: 'text-gray-900 font-medium',
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="mb-2">
        <Link href="/dashboard/candidates" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Candidates</Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <EditCandidateNameButton candidateId={candidate.id} currentName={candidate.full_name} />
            {(candidate.current_title || candidate.current_company) && (
              <p className="text-sm text-gray-700 font-medium mt-0.5">
                {[candidate.current_title, candidate.current_company].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
              {role?.title ?? 'No role assigned'}
              {clientName ? ` · ${clientName.name}` : ''}
            </p>
            <div className="mt-1">
              <AssignSpecialistButton
                candidateId={candidate.id}
                assignedToId={assignedTo}
                assignedToName={assignedToName}
                currentUserId={user?.id ?? ''}
                users={recruiters ?? []}
              />
            </div>
            {candidate.email && <p className="text-xs text-gray-400 mt-0.5">{candidate.email}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <CandidateTierBadge tier={candidate.tier as CandidateTier | null} />
            <RiskBadge risk={candidate.risk_level as RiskLevel | null} />
          </div>
        </div>
      </div>

      {/* Scorecard + Screening */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Review Scorecard</h2>
              <p className="text-xs text-gray-500 mt-0.5">11 criteria, tier, evidence &amp; risk notes</p>
            </div>
            {review
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Complete</span>
              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
            }
          </div>
          {review && <p className="text-xs text-gray-400 mb-3">Last updated {fmt(review.updated_at)}</p>}
          <Link href={`/dashboard/candidates/${id}/review`} className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors">
            {review ? 'Edit Review' : 'Start Review'}
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Screening Intelligence</h2>
              <p className="text-xs text-gray-500 mt-0.5">Motivation, leverage points &amp; risks</p>
            </div>
            {screening
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Complete</span>
              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
            }
          </div>
          {screening && <p className="text-xs text-gray-400 mb-3">Last updated {fmt(screening.updated_at)}</p>}
          <Link href={`/dashboard/candidates/${id}/screening`} className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors">
            {screening ? 'Edit Screening' : 'Start Screening'}
          </Link>
        </div>
      </div>

      {/* Internal Review */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Internal Review</h2>
        {inReview ? (
          <div className="space-y-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${finalStatusConfig[internalReview.final_status as keyof typeof finalStatusConfig]?.style ?? 'bg-gray-100 text-gray-600'}`}>
              {finalStatusConfig[internalReview.final_status as keyof typeof finalStatusConfig]?.label ?? internalReview.final_status}
            </span>
            <Link href={`/dashboard/internal-reviews/${internalReview.id}`} className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors">
              View Review →
            </Link>
          </div>
        ) : bothComplete ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Scorecard and screening are complete. Ready to submit for approval.</p>
            <SubmitReviewButton candidateId={id} />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Complete both the scorecard and screening before submitting for internal review.</p>
        )}
      </div>

      {/* Client Submission — shown once approved or already submitted */}
      {(isApproved || alreadySubmitted) && candidate.role_id && role?.client_id && (
        <SubmissionSection
          candidateId={candidate.id}
          roleId={candidate.role_id}
          clientId={role.client_id}
          roleTitle={role.title}
          candidateName={candidate.full_name}
          isApproved={isApproved}
          submissions={submissions}
        />
      )}

      {/* Interviews — shown once there is a submission */}
      {latestSubmission && (
        <InterviewSection
          candidateId={candidate.id}
          roleId={candidate.role_id ?? ''}
          submissionId={latestSubmission.id}
          interviews={interviews ?? []}
        />
      )}

      {/* Offer — shown once there is a submission */}
      {latestSubmission && (
        <OfferSection
          candidateId={candidate.id}
          roleId={candidate.role_id ?? ''}
          submissionId={latestSubmission.id}
          offers={offers ?? []}
        />
      )}

      {/* Activity Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity Timeline</h2>
        <ol className="relative">
          {timeline.map((event, i) => {
            const isLast = i === timeline.length - 1
            return (
              <li key={event.key} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center shrink-0">
                  <span className={`w-3 h-3 rounded-full border-2 mt-0.5 shrink-0 ${dotClass[event.status]}`} />
                  {!isLast && <span className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>
                <div className="pb-0.5">
                  <p className={`text-sm leading-tight ${labelClass[event.status]}`}>{event.label}</p>
                  {event.date && <p className="text-xs text-gray-400 mt-0.5">{fmt(event.date)}</p>}
                  {event.detail && <p className="text-xs text-gray-400 mt-0.5">{event.detail}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
