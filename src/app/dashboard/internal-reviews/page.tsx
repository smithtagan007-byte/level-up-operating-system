import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import type { CandidateTier } from '@/types'
import Link from 'next/link'

const statusConfig = {
  pending: { label: 'Pending', style: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved', style: 'bg-emerald-100 text-emerald-800' },
  rework: { label: 'Rework', style: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'Rejected', style: 'bg-red-100 text-red-800' },
  approved_for_formatting: { label: 'Approved for Formatting', style: 'bg-emerald-100 text-emerald-800' },
} as const

function StatusChip({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? { label: status, style: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.style}`}>{cfg.label}</span>
}

export default async function InternalReviewsPage() {
  const supabase = await createClient()

  const { data: reviews } = await supabase
    .from('internal_reviews')
    .select(`
      id,
      client_owner_status,
      talent_manager_status,
      final_status,
      created_at,
      candidates(id, full_name, tier, roles(title, clients(name)))
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Internal Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">{reviews?.length ?? 0} candidate{reviews?.length !== 1 ? 's' : ''} in review</p>
      </div>

      {!reviews?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No candidates have been submitted for review yet.</p>
          <p className="text-gray-300 text-xs mt-1">Complete a candidate's scorecard and screening, then submit from the candidate page.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role / Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Talent Manager</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Final Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((r) => {
                const candidate = (Array.isArray(r.candidates) ? r.candidates[0] : r.candidates) as { id: string; full_name: string; tier: string | null; roles: unknown } | null
                const role = candidate ? ((Array.isArray(candidate.roles) ? (candidate.roles as {title:string;clients:unknown}[])[0] : candidate.roles) as { title: string; clients: unknown } | null) : null
                const client = role ? ((Array.isArray(role.clients) ? (role.clients as {name:string}[])[0] : role.clients) as { name: string } | null) : null

                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{candidate?.full_name ?? '—'}</p>
                      <CandidateTierBadge tier={(candidate?.tier ?? null) as CandidateTier | null} />
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{role?.title ?? '—'}</p>
                      {client && <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>}
                    </td>
                    <td className="px-5 py-4"><StatusChip status={r.client_owner_status} /></td>
                    <td className="px-5 py-4"><StatusChip status={r.talent_manager_status} /></td>
                    <td className="px-5 py-4"><StatusChip status={r.final_status} /></td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/dashboard/internal-reviews/${r.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        Review →
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
