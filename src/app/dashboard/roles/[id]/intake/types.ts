export interface IntakeData {
  level?: string | null
  department?: string | null
  reports_to?: string | null
  headcount?: number | null
  employment_type?: string | null
  start_date?: string | null
  location?: string | null
  work_model?: string | null
  hybrid_days_onsite?: number | null
  salary_min?: number | null
  salary_max?: number | null
  bonus_notes?: string | null
  benefits_notes?: string | null
  must_have_skills?: string[]
  nice_to_have_skills?: string[]
  experience_years_min?: number | null
  qualifications_required?: string | null
  ideal_candidate_profile?: string | null
  personal_attributes?: string | null
  culture_fit_notes?: string | null
  interview_stages?: number | null
  interview_process_notes?: string | null
  assessment_required?: boolean
  decision_timeline?: string | null
  role_reason?: string | null
  team_context?: string | null
  red_flags?: string | null
}

export function isIntakeComplete(data: IntakeData): boolean {
  return !!(
    data.employment_type &&
    data.work_model &&
    data.salary_min &&
    data.salary_max &&
    data.experience_years_min &&
    data.role_reason &&
    (data.must_have_skills?.length ?? 0) >= 1
  )
}
