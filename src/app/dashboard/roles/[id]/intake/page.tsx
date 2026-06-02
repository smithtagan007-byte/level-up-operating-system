import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IntakeForm } from './IntakeForm'
import type { IntakeData } from './types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoleIntakePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: role, error: roleError }, { data: intake, error: intakeError }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, title, status, intake_completed, clients(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('role_intake')
      .select('*')
      .eq('role_id', id)
      .maybeSingle(),
  ])

  if (roleError) console.error('[intake] role query error:', JSON.stringify(roleError))
  if (intakeError) console.error('[intake] intake query error:', JSON.stringify(intakeError))

  if (!role) notFound()

  const client = (Array.isArray(role.clients) ? role.clients[0] : role.clients) as { name: string } | null

  // Map DB row to IntakeData shape
  const initial: IntakeData = intake ? {
    level: intake.level,
    department: intake.department,
    reports_to: intake.reports_to,
    headcount: intake.headcount,
    employment_type: intake.employment_type,
    start_date: intake.start_date,
    location: intake.location,
    work_model: intake.work_model,
    hybrid_days_onsite: intake.hybrid_days_onsite,
    salary_min: intake.salary_min,
    salary_max: intake.salary_max,
    bonus_notes: intake.bonus_notes,
    benefits_notes: intake.benefits_notes,
    must_have_skills: intake.must_have_skills ?? [],
    nice_to_have_skills: intake.nice_to_have_skills ?? [],
    experience_years_min: intake.experience_years_min,
    qualifications_required: intake.qualifications_required,
    ideal_candidate_profile: intake.ideal_candidate_profile,
    personal_attributes: intake.personal_attributes,
    culture_fit_notes: intake.culture_fit_notes,
    interview_stages: intake.interview_stages,
    interview_process_notes: intake.interview_process_notes,
    assessment_required: intake.assessment_required ?? false,
    decision_timeline: intake.decision_timeline,
    role_reason: intake.role_reason,
    team_context: intake.team_context,
    red_flags: intake.red_flags,
  } : {}

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href={`/dashboard/roles/${id}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← {role.title}
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Role Intake</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {role.title}{client ? ` · ${client.name}` : ''}
            </p>
          </div>
          {role.intake_completed
            ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Complete</span>
            : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
          }
        </div>
      </div>

      <IntakeForm roleId={id} initial={initial} />
    </div>
  )
}
