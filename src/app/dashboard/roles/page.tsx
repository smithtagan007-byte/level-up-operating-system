import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AddRoleModal } from './AddRoleModal'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ client?: string }>
}

export default async function RolesPage({ searchParams }: Props) {
  const { client: preselectedClientId } = await searchParams
  const supabase = await createClient()

  const [{ data: roles }, { data: clients }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, intake_completed, clients(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .order('name'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{roles?.length ?? 0} role{roles?.length !== 1 ? 's' : ''}</p>
        </div>
        <AddRoleModal clients={clients ?? []} preselectedClientId={preselectedClientId} />
      </div>

      {!roles?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">No roles yet. Add your first role above.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intake</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roles.map((role) => {
                const clientRow = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { name: string } | null
                return (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{role.title}</td>
                    <td className="px-5 py-4 text-gray-600">{clientRow?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4"><StatusBadge status={role.status} /></td>
                    <td className="px-5 py-4">
                      {role.intake_completed
                        ? <span className="text-emerald-600 text-xs font-medium">Complete</span>
                        : <span className="text-yellow-600 text-xs font-medium">Pending</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/roles/${role.id}`}
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
