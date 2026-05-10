import { createClient } from '@/lib/supabase/server'
import { CandidateTierBadge } from '@/components/ui/CandidateTierBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { AddCandidateModal } from './AddCandidateModal'
import type { CandidateTier, RiskLevel } from '@/types'
import Link from 'next/link'

export default async function CandidatesPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { data: roles }] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, tier, risk_level, roles(title, clients(name))')
      .order('created_at', { ascending: false }),
    supabase
      .from('roles')
      .select('id, title, clients(name)')
      .order('title'),
  ])

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
          <p className="text-gray-400 text-sm">No candidates yet. Add your first candidate above.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role / Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidates.map((c) => {
                const roleRaw = (Array.isArray(c.roles) ? c.roles[0] : c.roles) as { title: string; clients: unknown } | null
                const role = roleRaw ? { title: roleRaw.title } : null
                const client = roleRaw ? ((Array.isArray(roleRaw.clients) ? (roleRaw.clients as {name:string}[])[0] : roleRaw.clients) as { name: string } | null) : null
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
                    <td className="px-5 py-4"><CandidateTierBadge tier={c.tier as CandidateTier | null} /></td>
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
