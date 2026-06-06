import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AddRoleModal } from './AddRoleModal'
import { stageAgeInfo } from '@/lib/stageAge'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ client?: string }>
}

export default async function RolesPage({ searchParams }: Props) {
  const { client: preselectedClientId } = await searchParams
  const supabase = await createClient()

  const [{ data: roles }, { data: clients }, { data: teamRows }, { data: allUsers }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, intake_completed, entered_stage_at, clients(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .order('name'),
    supabase
      .from('role_team')
      .select('role_id, user_id, role_on_role')
      .eq('is_active', true),
    supabase
      .from('user_profiles')
      .select('id, full_name'),
  ])

  // Build a map: role_id → { clientOwner, specialistCount }
  const userNameMap = Object.fromEntries((allUsers ?? []).map(u => [u.id, u.full_name]))
  type TeamInfo = { clientOwnerName: string | null; specialistCount: number }
  const teamMap: Record<string, TeamInfo> = {}
  for (const row of teamRows ?? []) {
    if (!teamMap[row.role_id]) teamMap[row.role_id] = { clientOwnerName: null, specialistCount: 0 }
    const name = userNameMap[row.user_id] ?? null
    if (row.role_on_role === 'client_owner') {
      teamMap[row.role_id].clientOwnerName = name
    } else {
      teamMap[row.role_id].specialistCount++
    }
  }

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
          <p className="text-sm font-semibold text-gray-700 mb-1">No active roles yet</p>
          <p className="text-sm text-gray-400 mb-4">Roles are the mandates you&apos;re working on. Each role has its own candidate pipeline, intake brief, and team assignment.</p>
          <p className="text-xs text-gray-400">Use the &ldquo;New Role&rdquo; button above to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Owner</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intake</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {roles.map((role) => {
                const clientRow = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { name: string } | null
                const team = teamMap[role.id] ?? { clientOwnerName: null, specialistCount: 0 }
                return (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{role.title}</td>
                    <td className="px-5 py-4 text-gray-600">{clientRow?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-4">
                      {team.clientOwnerName
                        ? <span className="text-gray-700 text-sm">{team.clientOwnerName}</span>
                        : <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      {team.specialistCount > 0
                        ? <span className="text-xs text-gray-500">{team.specialistCount} specialist{team.specialistCount !== 1 ? 's' : ''}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={role.status} /></td>
                    <td className="px-5 py-4">
                      {(() => {
                        const age = stageAgeInfo(role.status, (role as { entered_stage_at?: string | null }).entered_stage_at)
                        if (!age) return <span className="text-gray-300 text-xs">—</span>
                        return (
                          <span className={`text-xs font-semibold ${
                            age.color === 'red' ? 'text-red-600' :
                            age.color === 'amber' ? 'text-amber-600' :
                            'text-gray-400'
                          }`}>
                            {age.label}
                          </span>
                        )
                      })()}
                    </td>
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
