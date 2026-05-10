import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { ApprovalPanel } from './ApprovalPanel'
import { notFound } from 'next/navigation'
import type { CandidateTier, RiskLevel } from '@/types'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

const SCORE_LABELS: Record<string, string> = {
  industry_fit: 'Industry Fit',
  technical_fit: 'Technical Fit',
  contextual_skill: 'Contextual Skill',
  qualification: 'Qualification',
  communication: 'Communication',
  stability: 'Stability',
  motivation: 'Motivation',
  salary_alignment: 'Salary Alignment',
  location_alignment: 'Location Alignment',
  culture_fit: 'Culture Fit',
  risk_score: 'Risk',
}

function ScoreBar({ score }: { score: number }) {
  const colour = score <= 3 ? 'bg-red-400' : score <= 6 ? 'bg-yellow-400' : score <= 8 ? 'bg-blue-400' : 'bg-emerald-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-5 text-right">{score}</span>
    </div>
  )
}

const finalStatusConfig = {
  pending: {
    label: 'Awaiting Review',
    desc: 'Both Client Owner and Talent Manager decisions are required.',
    style: 'bg-gray-50 border-gray-200 text-gray-700',
    dot: 'bg-gray-400',
  },
  approved_for_formatting: {
    label: 'Approved for Formatting',
    desc: 'Both approvals received. This candidate may proceed to CV formatting.',
    style: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  rework: {
    label: 'Rework Required',
    desc: 'This candidate must be returned to the recruiter to address feedback before progressing.',
    style: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    dot: 'bg-yellow-500',
  },
  rejected: {
    label: 'Rejected',
    desc: 'This candidate will not progress further.',
    style: 'bg-red-50 border-red-200 text-red-800',
    dot: 'bg-red-500',
  },
}

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: review }, { data: currentProfile }] = await Promise.all([
    supabase
      .from('internal_reviews')
      .select(`
        id, client_owner_status, client_owner_notes, talent_manager_status,
        talent_manager_notes, final_status, created_at,
        candidates(id, full_name, tier, risk_level, email),
        roles(id, title, clients(name)),
        co_profile:client_owner_id(full_name),
        tm_profile:talent_manager_id(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase.from('user_profiles').select('role').eq('id', user!.id).single(),
  ])

  if (!review) notFound()

  const candidateId = ((Array.isArray(review.candidates) ? review.candidates[0] : review.candidates) as { id: string } | null)?.id
  const roleId = ((Array.isArray(review.roles) ? review.roles[0] : review.roles) as { id: string } | null)?.id

  const [{ data: scorecard }, { data: screening }, { data: coTeamMember }] = await Promise.all([
    supabase.from('candidate_reviews').select('*').eq('candidate_id', candidateId!).maybeSingle(),
    supabase.from('candidate_screenings').select('*').eq('candidate_id', candidateId!).maybeSingle(),
    roleId
      ? supabase.from('role_team').select('user_id').eq('role_id', roleId).eq('role_on_role', 'client_owner').eq('is_active', true).eq('user_id', user!.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const candidate = (Array.isArray(review.candidates) ? review.candidates[0] : review.candidates) as { id: string; full_name: string; tier: string | null; risk_level: string | null; email: string | null } | null
  const role = (Array.isArray(review.roles) ? review.roles[0] : review.roles) as { id: string; title: string; clients: unknown } | null
  const client = role ? ((Array.isArray(role.clients) ? (role.clients as { name: string }[])[0] : role.clients) as { name: string } | null) : null
  const coProfile = (Array.isArray(review.co_profile) ? review.co_profile[0] : review.co_profile) as { full_name: string } | null
  const tmProfile = (Array.isArray(review.tm_profile) ? review.tm_profile[0] : review.tm_profile) as { full_name: string } | null

  const userRole = currentProfile?.role ?? ''
  const canActionCO = !!coTeamMember
  const canActionTM = userRole === 'talent_manager' || userRole === 'director'

  const finalCfg = finalStatusConfig[review.final_status as keyof typeof finalStatusConfig] ?? finalStatusConfig.pending

  const sc = scorecard as Record<string, unknown> | null

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/internal-reviews" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Internal Reviews</Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{candidate?.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {role?.title ?? '—'}{client ? ` · ${client.name}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <CandidateTierBadge tier={(candidate?.tier ?? null) as CandidateTier | null} />
            <RiskBadge risk={(candidate?.risk_level ?? null) as RiskLevel | null} />
          </div>
        </div>
      </div>

      {/* Final status banner */}
      <div className={`border rounded-xl px-5 py-4 mb-6 flex items-start gap-3 ${finalCfg.style}`}>
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${finalCfg.dot}`} />
        <div>
          <p className="text-sm font-semibold">{finalCfg.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{finalCfg.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Assessment summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Assessment Scores</h2>
          {sc ? (
            <div className="space-y-3">
              {Object.keys(SCORE_LABELS).map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{SCORE_LABELS[key]}</span>
                  </div>
                  <ScoreBar score={sc[key] as number} />
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Evidence Notes</p>
                <p className="text-xs text-gray-700 leading-relaxed">{sc.evidence_notes as string}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Risk Notes</p>
                <p className="text-xs text-gray-700 leading-relaxed">{sc.risk_notes as string}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No scorecard on file.</p>
          )}
        </div>

        {/* Screening summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Screening Intelligence</h2>
          {screening ? (
            <div className="space-y-4">
              {[
                { label: 'Motivation', key: 'motivation' },
                { label: 'Reason for Leaving', key: 'reason_for_leaving' },
                { label: 'Notice Period', key: 'notice_period' },
                { label: 'Counteroffer Risk', key: 'counteroffer_risk' },
                { label: 'Competing Interviews', key: 'competing_interviews' },
                { label: 'Recruiter Concerns', key: 'recruiter_concerns' },
              ].map(({ label, key }) => {
                const val = (screening as Record<string, unknown>)[key] as string
                return val ? (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{val}</p>
                  </div>
                ) : null
              })}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-900 mb-1">Leverage Points for Offer Stage</p>
                <p className="text-xs text-gray-700 leading-relaxed">{(screening as Record<string, unknown>).leverage_points as string}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No screening on file.</p>
          )}
        </div>
      </div>

      {/* Approval panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <ApprovalPanel
            reviewId={id}
            panelType="client_owner"
            currentStatus={review.client_owner_status}
            currentNotes={review.client_owner_notes}
            actionedByName={coProfile?.full_name ?? null}
            canAction={canActionCO}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <ApprovalPanel
            reviewId={id}
            panelType="talent_manager"
            currentStatus={review.talent_manager_status}
            currentNotes={review.talent_manager_notes}
            actionedByName={tmProfile?.full_name ?? null}
            canAction={canActionTM}
          />
        </div>
      </div>

      <div className="mt-6">
        <Link href={`/dashboard/candidates/${candidate?.id}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← View full candidate profile
        </Link>
      </div>
    </div>
  )
}
