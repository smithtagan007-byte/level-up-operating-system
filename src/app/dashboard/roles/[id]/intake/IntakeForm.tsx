'use client'

import { useState, useTransition, KeyboardEvent } from 'react'
import { saveRoleIntakeAction } from './actions'
import { isIntakeComplete, type IntakeData } from './types'

interface Props {
  roleId: string
  initial: IntakeData
}

function TagInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="min-h-10 flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-gray-400 hover:text-gray-700 leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input) addTag(input) }}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
      />
    </div>
  )
}

const REQUIRED_LABELS = [
  { key: 'employment_type', label: 'Employment type' },
  { key: 'work_model', label: 'Work model' },
  { key: 'salary_min', label: 'Salary min' },
  { key: 'salary_max', label: 'Salary max' },
  { key: 'experience_years_min', label: 'Min experience' },
  { key: 'role_reason', label: 'Role reason' },
  { key: 'must_have_skills', label: 'Must-have skills' },
] as const

export function IntakeForm({ roleId, initial }: Props) {
  const [form, setForm] = useState<IntakeData>({
    level: initial.level ?? '',
    department: initial.department ?? '',
    reports_to: initial.reports_to ?? '',
    headcount: initial.headcount ?? 1,
    employment_type: initial.employment_type ?? '',
    start_date: initial.start_date ?? '',
    location: initial.location ?? '',
    work_model: initial.work_model ?? '',
    hybrid_days_onsite: initial.hybrid_days_onsite ?? null,
    salary_min: initial.salary_min ?? null,
    salary_max: initial.salary_max ?? null,
    bonus_notes: initial.bonus_notes ?? '',
    benefits_notes: initial.benefits_notes ?? '',
    must_have_skills: initial.must_have_skills ?? [],
    nice_to_have_skills: initial.nice_to_have_skills ?? [],
    experience_years_min: initial.experience_years_min ?? null,
    qualifications_required: initial.qualifications_required ?? '',
    ideal_candidate_profile: initial.ideal_candidate_profile ?? '',
    personal_attributes: initial.personal_attributes ?? '',
    culture_fit_notes: initial.culture_fit_notes ?? '',
    interview_stages: initial.interview_stages ?? null,
    interview_process_notes: initial.interview_process_notes ?? '',
    assessment_required: initial.assessment_required ?? false,
    decision_timeline: initial.decision_timeline ?? '',
    role_reason: initial.role_reason ?? '',
    team_context: initial.team_context ?? '',
    red_flags: initial.red_flags ?? '',
  })

  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof IntakeData>(key: K, val: IntakeData[K]) {
    setSaved(false)
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const complete = isIntakeComplete(form)
  const requiredDone = REQUIRED_LABELS.filter(({ key }) => {
    if (key === 'must_have_skills') return (form.must_have_skills?.length ?? 0) >= 1
    const v = form[key as keyof IntakeData]
    return v !== null && v !== undefined && v !== ''
  }).length

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await saveRoleIntakeAction(roleId, form)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900 placeholder:text-gray-400'
  const textareaClass = `${inputClass} resize-none`
  const selectClass = inputClass
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1.5'
  const requiredMark = <span className="text-red-500 ml-0.5">*</span>

  return (
    <div className="space-y-5">
      {/* Progress indicator */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {complete ? '✓ Intake complete — role can move to Sourcing' : `${requiredDone} / ${REQUIRED_LABELS.length} required fields complete`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Fields marked <span className="text-red-500">*</span> are required to unlock Sourcing</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && !isPending && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Section 1 — The Role */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">The Role</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Employment Type {requiredMark}</label>
            <select value={form.employment_type ?? ''} onChange={e => set('employment_type', e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              <option>Permanent</option>
              <option>Contract</option>
              <option>Fixed-term</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Seniority Level</label>
            <select value={form.level ?? ''} onChange={e => set('level', e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              {['Junior', 'Mid', 'Senior', 'Lead', 'Principal', 'Head', 'Director'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Department / Team</label>
            <input type="text" value={form.department ?? ''} onChange={e => set('department', e.target.value)} placeholder="e.g. Engineering" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reports To</label>
            <input type="text" value={form.reports_to ?? ''} onChange={e => set('reports_to', e.target.value)} placeholder="e.g. CTO" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Headcount (# of positions)</label>
            <input type="number" min={1} value={form.headcount ?? 1} onChange={e => set('headcount', parseInt(e.target.value) || 1)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Target Start Date</label>
            <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Section 2 — Location & Working Model */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Location &amp; Working Model</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Location / City</label>
            <input type="text" value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Cape Town" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Model {requiredMark}</label>
            <select value={form.work_model ?? ''} onChange={e => set('work_model', e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
          </div>
          {form.work_model === 'Hybrid' && (
            <div>
              <label className={labelClass}>Days On-site per Week</label>
              <input type="number" min={1} max={5} value={form.hybrid_days_onsite ?? ''} onChange={e => set('hybrid_days_onsite', parseInt(e.target.value) || null)} placeholder="e.g. 3" className={inputClass} />
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Compensation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Compensation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Salary Min (per annum) {requiredMark}</label>
            <input type="number" value={form.salary_min ?? ''} onChange={e => set('salary_min', parseInt(e.target.value) || null)} placeholder="e.g. 480000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Salary Max (per annum) {requiredMark}</label>
            <input type="number" value={form.salary_max ?? ''} onChange={e => set('salary_max', parseInt(e.target.value) || null)} placeholder="e.g. 600000" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bonus / Commission</label>
            <input type="text" value={form.bonus_notes ?? ''} onChange={e => set('bonus_notes', e.target.value)} placeholder="e.g. 10% annual performance bonus" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Key Benefits</label>
            <textarea rows={2} value={form.benefits_notes ?? ''} onChange={e => set('benefits_notes', e.target.value)} placeholder="e.g. Medical aid, 25 days leave, flexible hours…" className={textareaClass} />
          </div>
        </div>
      </div>

      {/* Section 4 — Requirements */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Requirements</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Must-Have Skills {requiredMark}</label>
            <TagInput
              value={form.must_have_skills ?? []}
              onChange={tags => set('must_have_skills', tags)}
              placeholder="Type a skill and press Enter…"
            />
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add each skill</p>
          </div>
          <div>
            <label className={labelClass}>Nice-to-Have Skills</label>
            <TagInput
              value={form.nice_to_have_skills ?? []}
              onChange={tags => set('nice_to_have_skills', tags)}
              placeholder="Type a skill and press Enter…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Min. Years of Experience {requiredMark}</label>
              <input type="number" min={0} value={form.experience_years_min ?? ''} onChange={e => set('experience_years_min', parseInt(e.target.value) || null)} placeholder="e.g. 3" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Qualifications Required</label>
              <input type="text" value={form.qualifications_required ?? ''} onChange={e => set('qualifications_required', e.target.value)} placeholder="e.g. BSc Computer Science" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 5 — Ideal Candidate */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Ideal Candidate</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Background &amp; Experience Profile</label>
            <textarea rows={3} value={form.ideal_candidate_profile ?? ''} onChange={e => set('ideal_candidate_profile', e.target.value)} placeholder="Describe the ideal candidate's background…" className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Personal Attributes</label>
            <textarea rows={2} value={form.personal_attributes ?? ''} onChange={e => set('personal_attributes', e.target.value)} placeholder="e.g. Detail-oriented, collaborative, self-starter…" className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Culture Fit Notes</label>
            <textarea rows={2} value={form.culture_fit_notes ?? ''} onChange={e => set('culture_fit_notes', e.target.value)} placeholder="What kind of person thrives at this client…" className={textareaClass} />
          </div>
        </div>
      </div>

      {/* Section 6 — Interview Process */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Interview Process</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Number of Stages</label>
            <input type="number" min={1} value={form.interview_stages ?? ''} onChange={e => set('interview_stages', parseInt(e.target.value) || null)} placeholder="e.g. 3" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Decision Timeline</label>
            <input type="text" value={form.decision_timeline ?? ''} onChange={e => set('decision_timeline', e.target.value)} placeholder="e.g. 2 weeks from final interview" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Process Description</label>
            <textarea rows={3} value={form.interview_process_notes ?? ''} onChange={e => set('interview_process_notes', e.target.value)} placeholder="Stage 1: screening call, Stage 2: technical test, Stage 3: panel interview…" className={textareaClass} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="assessment_required"
              checked={form.assessment_required ?? false}
              onChange={e => set('assessment_required', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-gray-900"
            />
            <label htmlFor="assessment_required" className="text-sm text-gray-700">Technical assessment / case study required</label>
          </div>
        </div>
      </div>

      {/* Section 7 — Brief Context */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Brief Context</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Why Does This Role Exist? {requiredMark}</label>
            <select value={form.role_reason ?? ''} onChange={e => set('role_reason', e.target.value)} className={selectClass}>
              <option value="">Select…</option>
              <option>New headcount</option>
              <option>Backfill</option>
              <option>Growth</option>
              <option>Replacement</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Team Context</label>
            <textarea rows={3} value={form.team_context ?? ''} onChange={e => set('team_context', e.target.value)} placeholder="Describe the team this person will join, the dynamics, any relevant context…" className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Known Red Flags / Dealbreakers</label>
            <textarea rows={2} value={form.red_flags ?? ''} onChange={e => set('red_flags', e.target.value)} placeholder="Anything that would immediately disqualify a candidate…" className={textareaClass} />
          </div>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-3 pb-6">
        {saved && !isPending && (
          <span className="text-sm text-emerald-600 font-medium">
            {complete ? '✓ Intake complete — Sourcing is now unlocked' : '✓ Progress saved'}
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Intake'}
        </button>
      </div>
    </div>
  )
}
