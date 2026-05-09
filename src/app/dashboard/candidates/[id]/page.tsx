import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { SubmitReviewButton } from './SubmitReviewButton'
import { MarkSubmittedButton } from './MarkSubmittedButton'
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

export default async function CandidateDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidate }, { data: review }, { data: screening }, { data: internalReview }] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, tier, risk_level, submitted_to_client, role_id, roles(title, client_id, clients(name))')
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
      .select('id, final_status')
      .eq('candidate_id', id)
      .maybeSingle(),
  ])

  if (!candidate) notFound()

  const roleRaw = (Array.isArray(candidate.roles) ? candidate.roles[0] : candidate.roles) as { title: string; client_id: string; clients: unknown } | null
  const role = roleRaw ? { title: roleRaw.title, client_id: roleRaw.client_id, clients: roleRaw.clients } : null
  const clientName = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null

  const bothComplete = !!review && !!screening
  const inReview = !!internalReview
  const isApproved = internalReview?.final_status === 'approved_for_formatting'
  const alreadySubmitted = !!candidate.submitted_to_client

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/candidates" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Candidates</Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{candidate.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {role?.title ?? 'No role assigned'}
              {clientName ? ` · ${clientName.name}` : ''}
            </p>
            {candidate.email && <p className="text-xs text-gray-400 mt-0.5">{candidate.email}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <CandidateTierBadge tier={candidate.tier as CandidateTier | null} />
            <RiskBadge risk={candidate.risk_level as RiskLevel | null} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Review Scorecard */}
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
          {review && (
            <p className="text-xs text-gray-400 mb-3">
              Last updated {new Date(review.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          <Link
            href={`/dashboard/candidates/${id}/review`}
            className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            {review ? 'Edit Review' : 'Start Review'}
          </Link>
        </div>

        {/* Screening Intelligence */}
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
          {screening && (
            <p className="text-xs text-gray-400 mb-3">
              Last updated {new Date(screening.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          <Link
            href={`/dashboard/candidates/${id}/screening`}
            className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            {screening ? 'Edit Screening' : 'Start Screening'}
          </Link>
        </div>
      </div>

      {/* Internal Review section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Internal Review</h2>

        {inReview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${finalStatusConfig[internalReview.final_status as keyof typeof finalStatusConfig]?.style ?? 'bg-gray-100 text-gray-600'}`}>
                {finalStatusConfig[internalReview.final_status as keyof typeof finalStatusConfig]?.label ?? internalReview.final_status}
              </span>
            </div>
            <Link
              href={`/dashboard/internal-reviews/${internalReview.id}`}
              className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              View Review →
            </Link>
            {isApproved && !alreadySubmitted && candidate.role_id && role?.client_id && (
              <MarkSubmittedButton
                candidateId={candidate.id}
                roleId={candidate.role_id}
                clientId={role.client_id}
                roleTitle={role.title}
              />
            )}
            {alreadySubmitted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Submitted to Client
              </span>
            )}
          </div>
        ) : bothComplete ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Scorecard and screening are complete. Ready to submit for Client Owner and Talent Manager approval.</p>
            <SubmitReviewButton candidateId={id} />
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Complete both the scorecard and screening form before submitting for internal review.
          </p>
        )}
      </div>
    </div>
  )
}
