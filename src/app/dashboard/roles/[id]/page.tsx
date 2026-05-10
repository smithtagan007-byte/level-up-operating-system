import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RoleActions } from './RoleActions'
import { RoleRevenueSection } from './RoleRevenueSection'
import { TeamSection } from './TeamSection'
import type { TeamMember } from './TeamSection'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ assignTeam?: string }>
}

export default async function RoleDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { assignTeam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: role }, { data: roleRevenue }, { data: profile }, { data: teamRows }, { data: allUsers }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, intake_completed, client_id, clients(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('role_revenue')
      .select('*')
      .eq('role_id', id)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user!.id)
      .single(),
    supabase
      .from('role_team')
      .select('user_id, role_on_role, user_profiles(full_name)')
      .eq('role_id', id)
      .eq('is_active', true),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .order('full_name'),
  ])

  if (!role) notFound()

  const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { id: string; name: string } | null
  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  const team: TeamMember[] = (teamRows ?? []).map(row => {
    const up = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles
    return {
      user_id: row.user_id,
      role_on_role: row.role_on_role as 'client_owner' | 'delivery_specialist',
      full_name: (up as { full_name: string } | null)?.full_name ?? 'Unknown',
    }
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/roles" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Roles
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{role.title}</h1>
            {client && (
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-sm text-gray-500 hover:text-gray-700 mt-0.5 inline-block transition-colors"
              >
                {client.name} →
              </Link>
            )}
          </div>
          <StatusBadge status={role.status} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Status</dt>
              <dd><StatusBadge status={role.status} /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Intake</dt>
              <dd>
                {role.intake_completed
                  ? <span className="text-emerald-600 text-sm font-medium">Complete</span>
                  : <span className="text-yellow-600 text-sm font-medium">Pending</span>
                }
              </dd>
            </div>
          </dl>
        </div>

        <TeamSection
          roleId={role.id}
          team={team}
          users={allUsers ?? []}
          isManager={isManager}
          defaultOpen={assignTeam === '1'}
        />

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Stage Management</h2>
          <RoleActions
            roleId={role.id}
            currentStatus={role.status}
            intakeCompleted={role.intake_completed}
          />
        </div>

        <RoleRevenueSection roleId={role.id} existing={roleRevenue ?? null} />
      </div>
    </div>
  )
}
