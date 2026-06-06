import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { stageAgeInfo } from '@/lib/stageAge'
import { RoleActions } from './RoleActions'
import { RoleRevenueSection } from './RoleRevenueSection'
import { TeamSection } from './TeamSection'
import { RoleCandidatesSection } from './RoleCandidatesSection'
import { RoleGuidanceBanner } from './RoleGuidanceBanner'
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

  const [{ data: role }, { data: roleRevenue }, { data: profile }, { data: teamRows }, { data: allUsers }, { data: candidateSummary }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, intake_completed, client_id, entered_stage_at, clients(id, name)')
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
      .select('user_id, role_on_role')
      .eq('role_id', id)
      .eq('is_active', true),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .order('full_name'),
    supabase
      .from('candidates')
      .select('id, submitted_to_client, client_owner_approved')
      .eq('role_id', id),
  ])

  if (!role) notFound()

  const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { id: string; name: string } | null
  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  const candidates = candidateSummary ?? []
  const approvedNotSubmitted = candidates.filter(c => c.client_owner_approved && !c.submitted_to_client).length
  const submittedToClient = candidates.filter(c => c.submitted_to_client).length

  const userNameMap = Object.fromEntries((allUsers ?? []).map(u => [u.id, u.full_name]))
  const team: TeamMember[] = (teamRows ?? []).map(row => ({
    user_id: row.user_id,
    role_on_role: row.role_on_role as 'client_owner' | 'delivery_specialist',
    full_name: userNameMap[row.user_id] ?? 'Unknown',
  }))

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
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={role.status} />
            {(() => {
              const age = stageAgeInfo(role.status, (role as { entered_stage_at?: string | null }).entered_stage_at)
              if (!age) return null
              return (
                <span className={`text-xs font-medium ${
                  age.color === 'red' ? 'text-red-600' :
                  age.color === 'amber' ? 'text-amber-600' :
                  'text-gray-400'
                }`}>
                  {age.days === 0 ? 'Entered today' : `${age.days}d in stage`}
                </span>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Guidance banner */}
        <RoleGuidanceBanner
          roleId={role.id}
          status={role.status}
          intakeCompleted={role.intake_completed ?? false}
          candidateCount={candidates.length}
          approvedNotSubmitted={approvedNotSubmitted}
          submittedToClient={submittedToClient}
          interviewsScheduled={0}
        />

        {/* 1. Stage Management */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Stage Management</h2>
          <RoleActions
            roleId={role.id}
            currentStatus={role.status}
            intakeCompleted={role.intake_completed}
          />
        </div>

        {/* 2. Candidates */}
        <RoleCandidatesSection
          roleId={role.id}
          roleTitle={role.title}
          clientName={client?.name ?? null}
        />

        {/* 3. Role Intake */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Role Intake</h2>
              <p className="text-xs text-gray-500 mt-0.5">Level, location, compensation, requirements &amp; brief</p>
            </div>
            {role.intake_completed
              ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Complete</span>
              : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
            }
          </div>
          <div className="mt-4">
            <Link
              href={`/dashboard/roles/${role.id}/intake`}
              className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              {role.intake_completed ? 'View Intake Form' : 'Complete Intake Form →'}
            </Link>
          </div>
        </div>

        {/* 4. Team */}
        <TeamSection
          roleId={role.id}
          team={team}
          users={allUsers ?? []}
          isManager={isManager}
          defaultOpen={assignTeam === '1'}
        />

        {/* 5. Revenue */}
        <RoleRevenueSection roleId={role.id} existing={roleRevenue ?? null} />
      </div>
    </div>
  )
}
