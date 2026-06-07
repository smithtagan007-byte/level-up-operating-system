import { createClient } from '@/lib/supabase/server'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { AddCandidateModal } from './AddCandidateModal'
import type { RiskLevel } from '@/types'
import Link from 'next/link'

function getCandidateStage(
  candidateId: string,
  submittedToClient: boolean,
  roleStatus: string | null,
  reviewedSet: Set<string>,
  screenedSet: Set<string>,
  irMap: Record<string, string>
): { label: string; style: string } {
  if (submittedToClient) {
    if (roleStatus === 'offer') return { label: 'Offer Stage', style: 'bg-purple-100 text-purple-800' }
    if (roleStatus === 'interviewing') return { label: 'Interviewing', style: 'bg-indigo-100 text-indigo-800' }
    return { label: 'Submitted', style: 'bg-emerald-100 text-emerald-800' }
  }
  const ir = irMap[candidateId]
  if (ir === 'approved_for_formatting') return { label: 'Approved', style: 'bg-teal-100 text-teal-800' }
  if (ir === 'rework') return { label: 'Rework', style: 'bg-orange-100 text-orange-800' }
  if (ir === 'rejected') return { label: 'Rejected', style: 'bg-red-100 text-red-800' }
  if (ir === 'pending') return { label: 'In Review', style: 'bg-blue-100 text-blue-800' }
  if (reviewedSet.has(candidateId) && screenedSet.has(candidateId)) return { label: 'Ready for Review', style: 'bg-indigo-100 text-indigo-800' }
  if (reviewedSet.has(candidateId)) return { label: 'Screening Pending', style: 'bg-amber-100 text-amber-800' }
  return { label: 'Scorecard Pending', style: 'bg-gray-100 text-gray-600' }
}

export default async function CandidatesPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { data: roles }] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, risk_level, submitted_to_client, assigned_to, roles(title, status, clients(name))')
      .order('created_at', { ascending: false }),
    // Only roles with completed intake that have moved past the intake stage
    supabase
      .from('roles')
      .select('id, title, clients(name)')
      .eq('intake_completed', true)
      .neq('status', 'intake')
      .order('title'),
  ])

  const candidateIds = (candidates ?? []).map(c => c.id)
  const assignedToIds = [...new Set((candidates ?? []).map(c => (c as { assigned_to?: string | null }).assigned_to).filter(Boolean) as string[])]

  const [{ data: reviews }, { data: screenings }, { data: internalReviews }, { data: assignedUsers }] = await Promise.all([
    candidateIds.length > 0
      ? supabase.from('candidate_reviews').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[] }),
    candidateIds.length > 0
      ? supabase.from('candidate_screenings').select('candidate_id').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string }[] }),
    candidateIds.length > 0
      ? supabase.from('internal_reviews').select('candidate_id, final_status').in('candidate_id', candidateIds)
      : Promise.resolve({ data: [] as { candidate_id: string; final_status: string }[] }),
    assignedToIds.length > 0
      ? supabase.from('user_profiles').select('id, full_name').in('id', assignedToIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  const reviewedSet = new Set((reviews ?? []).map(r => r.candidate_id))
  const screenedSet = new Set((screenings ?? []).map(s => s.candidate_id))
  const irMap = Object.fromEntries((internalReviews ?? []).map(r => [r.candidate_id, r.final_status]))
  const userNameMap = Object.fromEntries((assignedUsers ?? []).map(u => [u.id, u.full_name]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{candidates?.length ?? 0} candidate{candidates?.length !== 1 ? 's' : ''}</p>
        </div>
        <AddCandidateModal roles={(roles ?? []).map(r => ({ ...r, clients: (Array.isArray(r.clients) ? r.clients[0] : r.clients) as { name: string } | null }))} />
      </div>

      {!candidates?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-1">No candidates yet</p>
          <p className="text-sm text-gray-400 mb-4">Add candidates, complete their scorecard and screening, then submit them through internal review before they reach the client.</p>
          <p className="text-xs text-gray-400">Use &ldquo;Add Candidate&rdquo; above to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role / Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidates.map((c) => {
                const roleRaw = (Array.isArray(c.roles) ? c.roles[0] : c.roles) as { title: string; status: string; clients: unknown } | null
                const role = roleRaw ? { title: roleRaw.title } : null
                const roleStatus = roleRaw?.status ?? null
                const client = roleRaw ? ((Array.isArray(roleRaw.clients) ? (roleRaw.clients as { name: string }[])[0] : roleRaw.clients) as { name: string } | null) : null
                const assignedTo = (c as { assigned_to?: string | null }).assigned_to ?? null
                const ownerName = assignedTo ? userNameMap[assignedTo] ?? null : null
                const submittedToClient = (c as { submitted_to_client?: boolean }).submitted_to_client ?? false
                const stage = getCandidateStage(c.id, submittedToClient, roleStatus, reviewedSet, screenedSet, irMap)
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{c.full_name}</p>
                      {c.email && <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{role?.title ?? <span className="text-gray-300">—</span>}</p>
                      {client && <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stage.style}`}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {ownerName
                        ? <span className="text-sm text-gray-700">{ownerName}</span>
                        : <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                      }
                    </td>
                    <td className="px-5 py-4"><RiskBadge risk={c.risk_level as RiskLevel | null} /></td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/dashboard/candidates/${c.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        View →
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
