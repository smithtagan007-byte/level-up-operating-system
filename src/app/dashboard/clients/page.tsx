import { createClient } from '@/lib/supabase/server'
import { ClientGradeBadge } from '@/components/ui/ClientGradeBadge'
import { AddClientModal } from './AddClientModal'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: users }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, industry, grade, owner_id, user_profiles(full_name)')
      .order('name'),
    supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .in('role', ['talent_specialist', 'talent_manager'])
      .order('full_name'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients?.length ?? 0} client{clients?.length !== 1 ? 's' : ''}</p>
        </div>
        <AddClientModal users={users ?? []} />
      </div>

      {!clients?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No clients yet. Add your first client above.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Industry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const owner = (Array.isArray(client.user_profiles) ? client.user_profiles[0] : client.user_profiles) as { full_name: string } | null
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{client.name}</td>
                    <td className="px-5 py-4 text-gray-600">{client.industry ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      <ClientGradeBadge grade={client.grade} />
                    </td>
                    <td className="px-5 py-4 text-gray-600">{owner?.full_name ?? <span className="text-gray-300">Unassigned</span>}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                      >
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
