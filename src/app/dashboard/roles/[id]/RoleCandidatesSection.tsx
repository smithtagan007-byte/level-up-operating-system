import { createClient } from '@/lib/supabase/server'
import { AddCandidateModal } from '@/app/dashboard/candidates/AddCandidateModal'
import { CandidatesBoardClient } from './CandidatesBoardClient'
import type { BoardCandidate } from './CandidatesBoardView'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface Props {
  roleId: string
  roleTitle: string
  clientName: string | null
  roleStatus: string
  intakeCompleted: boolean
}

/** Derive kanban column from existing data fields (used before pipeline_stage migration) */
function deriveStage(
  submitted: boolean,
  internalStatus: string | undefined,
  hasScreening: boolean
): string {
  if (submitted) return 'submitted'
  if (internalStatus === 'approved_for_formatting') return 'approved'
  if (internalStatus === 'rework' || internalStatus === 'pending') return 'in_review'
  if (hasScreening) return 'screening'
  return 'unprocessed'
}

export async function RoleCandidatesSection({ roleId, roleTitle, clientName, roleStatus, intakeCompleted }: Props) {

  // ── Locked state: role hasn't left intake yet ──────────────────────────
  if (roleStatus === 'intake') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-4">
          <Lock size={16} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1">Candidate pipeline locked</p>

        {!intakeCompleted ? (
          <>
            <p className="text-sm text-gray-400 mb-5">
              Complete the intake form before sourcing candidates for this role.
            </p>
            <Link
              href={`/dashboard/roles/${roleId}/intake`}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Complete Intake →
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-400">
            Intake is complete. Move this role to{' '}
            <strong className="text-gray-600">Sourcing</strong>{' '}
            on the Roles board to open the candidate pipeline.
          </p>
        )}
      </div>
    )
  }

  // ── Active state: role is in sourcing or beyond ────────────────────────
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, full_name, email, current_company, current_title, tier, risk_level, submitted_to_client, created_at')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })

  const candidateIds = (candidates ?? []).map(c => c.id)

  const [{ data: reviews }, { data: screenings }, { data: internalReviews }] = await Promise.all([
    candidateIds.length > 0
      ? supabase.from('candidate_reviews').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[] }),
    candidateIds.length > 0
      ? supabase.from('candidate_screenings').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[] }),
    candidateIds.length > 0
      ? supabase.from('internal_reviews').select('candidate_id, final_status').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string; final_status: string }[] }),
  ])

  const reviewedIds = new Set((reviews ?? []).map(r => r.candidate_id))
  const screenedIds = new Set((screenings ?? []).map(s => s.candidate_id))
  const irMap = Object.fromEntries(
    (internalReviews ?? []).map(r => [r.candidate_id, r.final_status])
  )

  const boardCandidates: BoardCandidate[] = (candidates ?? []).map(c => {
    const internalStatus = irMap[c.id]
    const hasScreening = screenedIds.has(c.id)

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email ?? null,
      current_title: c.current_title ?? null,
      current_company: c.current_company ?? null,
      tier: c.tier ?? null,
      risk_level: c.risk_level ?? null,
      pipeline_stage: deriveStage(c.submitted_to_client ?? false, internalStatus, hasScreening),
      submitted_to_client: c.submitted_to_client ?? false,
      hasReview: reviewedIds.has(c.id),
      hasScreening,
      internalStatus: internalStatus ?? null,
    }
  })

  const roleForModal = [{
    id: roleId,
    title: roleTitle,
    clients: clientName ? { name: clientName } : null,
  }]

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {boardCandidates.length} candidate{boardCandidates.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Drag to advance through the pipeline</p>
        </div>
        <AddCandidateModal roles={roleForModal} />
      </div>

      <CandidatesBoardClient candidates={boardCandidates} roleId={roleId} />
    </div>
  )
}
