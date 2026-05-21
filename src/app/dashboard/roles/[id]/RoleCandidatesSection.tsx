import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { AddCandidateModal } from '@/app/dashboard/candidates/AddCandidateModal'
import Link from 'next/link'
import type { CandidateTier, RiskLevel } from '@/types'

interface Props {
  roleId: string
  roleTitle: string
  clientName: string | null
}

export async function RoleCandidatesSection({ roleId, roleTitle, clientName }: Props) {
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, full_name, email, current_company, current_title, tier, risk_level, client_owner_approved, talent_manager_approved, submitted_to_client, created_at')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })

  const candidateIds = (candidates ?? []).map(c => c.id)

  const [{ data: reviews }, { data: screenings }, { data: internalReviews }] = await Promise.all([
    candidateIds.length > 0
      ? supabase.from('candidate_reviews').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length > 0
      ? supabase.from('candidate_screenings').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] }),
    candidateIds.length > 0
      ? supabase.from('internal_reviews').select('candidate_id, final_status').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] }),
  ])

  const reviewedIds = new Set((reviews ?? []).map(r => r.candidate_id))
  const screenedIds = new Set((screenings ?? []).map(s => s.candidate_id))
  const internalReviewMap = Object.fromEntries(
    (internalReviews ?? []).map(r => [r.candidate_id, r.final_status])
  )

  const roleForModal = [{
    id: roleId,
    title: roleTitle,
    clients: clientName ? { name: clientName } : null,
  }]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Candidates</h2>
          <p className="text-xs text-gray-400 mt-0.5">{(candidates ?? []).length} linked to this role</p>
        </div>
        <AddCandidateModal roles={roleForModal} />
      </div>

      {(candidates ?? []).length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No candidates yet — add one above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Role</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scorecard</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Screening</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Review</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(candidates ?? []).map(c => {
                const internalStatus = internalReviewMap[c.id]
                const hasReview = reviewedIds.has(c.id)
                const hasScreening = screenedIds.has(c.id)

                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <Link href={`/dashboard/candidates/${c.id}`} className="hover:underline">
                        {c.full_name}
                      </Link>
                      {c.email && <p className="text-xs text-gray-400 font-normal">{c.email}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.current_title
                        ? <span>{c.current_title}{c.current_company ? <span className="text-gray-400"> @ {c.current_company}</span> : ''}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <CandidateTierBadge tier={c.tier as CandidateTier | null} />
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge risk={c.risk_level as RiskLevel | null} />
                    </td>
                    <td className="px-5 py-3">
                      {hasReview
                        ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Done</span>
                        : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Pending</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      {hasScreening
                        ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Done</span>
                        : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Pending</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      {internalStatus === 'approved_for_formatting' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Approved</span>
                      )}
                      {internalStatus === 'pending' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">In Review</span>
                      )}
                      {internalStatus === 'rejected' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Rejected</span>
                      )}
                      {internalStatus === 'rework' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Rework</span>
                      )}
                      {!internalStatus && (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/dashboard/candidates/${c.id}`} className="text-xs text-gray-400 hover:text-gray-700 font-medium">
                        Open →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
