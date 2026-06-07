import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { stageAgeInfo } from '@/lib/stageAge'
import { RoleRevenueSection } from './RoleRevenueSection'
import { TeamSection } from './TeamSection'
import { RoleCandidatesSection } from './RoleCandidatesSection'
import { RoleGuidanceBanner } from './RoleGuidanceBanner'
import { RoleTabNav } from './RoleTabNav'
import type { TeamMember } from './TeamSection'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Briefcase, Banknote, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ assignTeam?: string; tab?: string }>
}

export default async function RoleDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { assignTeam, tab } = await searchParams
  const activeTab = tab ?? 'candidates'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: role },
    { data: roleRevenue },
    { data: profile },
    { data: teamRows },
    { data: allUsers },
    { data: candidateSummary },
    { data: intake },
  ] = await Promise.all([
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
    supabase
      .from('role_intake')
      .select('salary_min, salary_max, location, employment_type, level, department, experience_years_min')
      .eq('role_id', id)
      .maybeSingle(),
  ])

  if (!role) notFound()

  const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { id: string; name: string } | null
  const isManager = ['talent_manager', 'director'].includes(profile?.role ?? '')

  const candidates = candidateSummary ?? []
  const candidateCount = candidates.length
  const approvedNotSubmitted = candidates.filter(c => c.client_owner_approved && !c.submitted_to_client).length
  const submittedToClient = candidates.filter(c => c.submitted_to_client).length

  const userNameMap = Object.fromEntries((allUsers ?? []).map(u => [u.id, u.full_name]))
  const team: TeamMember[] = (teamRows ?? []).map(row => ({
    user_id: row.user_id,
    role_on_role: row.role_on_role as 'client_owner' | 'delivery_specialist',
    full_name: userNameMap[row.user_id] ?? 'Unknown',
  }))

  // Salary display
  const fmt = (val: number | null | undefined) =>
    val ? `R${Number(val).toLocaleString()}` : null
  const salaryDisplay =
    intake?.salary_min || intake?.salary_max
      ? [fmt(intake?.salary_min), fmt(intake?.salary_max)].filter(Boolean).join(' – ')
      : null

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-5">
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

            {/* Intake meta row */}
            {(intake?.location || intake?.employment_type || salaryDisplay) && (
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {intake?.location && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={11} />
                    {intake.location}
                  </span>
                )}
                {intake?.employment_type && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Briefcase size={11} />
                    {intake.employment_type}
                  </span>
                )}
                {salaryDisplay && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Banknote size={11} />
                    {salaryDisplay}/month
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status + age */}
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

      {/* ── Guidance banner (always visible, context-aware) ── */}
      <div className="mb-5">
        <RoleGuidanceBanner
          roleId={role.id}
          status={role.status}
          intakeCompleted={role.intake_completed ?? false}
          candidateCount={candidateCount}
          approvedNotSubmitted={approvedNotSubmitted}
          submittedToClient={submittedToClient}
          interviewsScheduled={0}
        />
      </div>

      {/* ── Tab Navigation ─────────────────────────────────── */}
      <RoleTabNav
        roleId={role.id}
        activeTab={activeTab}
        candidateCount={candidateCount}
      />

      {/* ── Tab Content ────────────────────────────────────── */}
      <div className="mt-5">

        {/* CANDIDATES (default) */}
        {activeTab === 'candidates' && (
          <RoleCandidatesSection
            roleId={role.id}
            roleTitle={role.title}
            clientName={client?.name ?? null}
            roleStatus={role.status}
            intakeCompleted={role.intake_completed ?? false}
          />
        )}

        {/* INTAKE */}
        {activeTab === 'intake' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Role Intake</h2>
              {role.intake_completed
                ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Complete</span>
                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
              }
            </div>

            {!role.intake_completed && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Intake is incomplete — this role cannot move to sourcing until the form is finished.
                </p>
              </div>
            )}

            {/* Intake summary fields */}
            {intake && (intake.location || intake.employment_type || intake.level || intake.department || intake.experience_years_min || salaryDisplay) && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
                {intake.location && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</p>
                    <p className="text-sm text-gray-700 mt-0.5">{intake.location}</p>
                  </div>
                )}
                {intake.employment_type && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Employment Type</p>
                    <p className="text-sm text-gray-700 mt-0.5">{intake.employment_type}</p>
                  </div>
                )}
                {intake.level && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Level</p>
                    <p className="text-sm text-gray-700 mt-0.5">{intake.level}</p>
                  </div>
                )}
                {intake.department && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Department</p>
                    <p className="text-sm text-gray-700 mt-0.5">{intake.department}</p>
                  </div>
                )}
                {intake.experience_years_min && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Min Experience</p>
                    <p className="text-sm text-gray-700 mt-0.5">{intake.experience_years_min}+ years</p>
                  </div>
                )}
                {salaryDisplay && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Salary Range</p>
                    <p className="text-sm text-gray-700 mt-0.5">{salaryDisplay} / month</p>
                  </div>
                )}
              </div>
            )}

            <Link
              href={`/dashboard/roles/${role.id}/intake`}
              className="block text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              {role.intake_completed ? 'View / Edit Intake Form →' : 'Complete Intake Form →'}
            </Link>
          </div>
        )}

        {/* TEAM */}
        {activeTab === 'team' && (
          <TeamSection
            roleId={role.id}
            team={team}
            users={allUsers ?? []}
            isManager={isManager}
            defaultOpen={assignTeam === '1'}
          />
        )}

        {/* REVENUE */}
        {activeTab === 'revenue' && (
          <RoleRevenueSection roleId={role.id} existing={roleRevenue ?? null} />
        )}

      </div>
    </div>
  )
}
