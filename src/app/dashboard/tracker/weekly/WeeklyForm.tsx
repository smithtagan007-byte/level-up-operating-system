'use client'

import { useState, useTransition } from 'react'
import { saveWeeklyDataAction, WeeklyPayload } from './actions'
import { formatZAR } from '@/lib/format'

interface WeekSnapshot {
  weekStart: string
  fyYear: number
  fyWeek: number
  weekNumber: number
  month: number
  year: number
}

interface ExistingData {
  // sales
  newClients: number
  signedTerms: number
  newRoles: number
  callsMade: number
  followUps: number
  // delivery
  cvs: number
  cvsDeclined: number
  firstInterviews: number
  secondInterviews: number
  assessments: number
  declines: number
  offers: number
  offersDeclined: number
  starts: number
  revenue: number
  cost: number
}

interface Props {
  userId: string
  weeks: WeekSnapshot[]
  initialWeek: string
  existingByWeek: Record<string, ExistingData>
  autoCvsByWeek: Record<string, number>
}

const EMPTY: ExistingData = {
  newClients: 0, signedTerms: 0, newRoles: 0, callsMade: 0, followUps: 0,
  cvs: 0, cvsDeclined: 0, firstInterviews: 0, secondInterviews: 0,
  assessments: 0, declines: 0, offers: 0, offersDeclined: 0, starts: 0,
  revenue: 0, cost: 0,
}

export function WeeklyForm({ userId, weeks, initialWeek, existingByWeek, autoCvsByWeek }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek)
  const [fields, setFields] = useState<ExistingData>(existingByWeek[initialWeek] ?? EMPTY)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleWeekChange(weekStart: string) {
    setSelectedWeek(weekStart)
    setFields(existingByWeek[weekStart] ?? { ...EMPTY, cvs: autoCvsByWeek[weekStart] ?? 0 })
    setSaved(false)
    setError(null)
  }

  function setField(key: keyof ExistingData, value: number) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const snap = weeks.find(w => w.weekStart === selectedWeek)
    if (!snap) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        const payload: WeeklyPayload = {
          userId,
          weekStart: snap.weekStart,
          fyYear: snap.fyYear,
          fyWeek: snap.fyWeek,
          weekNumber: snap.weekNumber,
          month: snap.month,
          year: snap.year,
          ...fields,
        }
        await saveWeeklyDataAction(payload)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const autoCvs = autoCvsByWeek[selectedWeek] ?? 0
  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 text-right'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
          <select
            value={selectedWeek}
            onChange={e => handleWeekChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            {weeks.map(w => (
              <option key={w.weekStart} value={w.weekStart}>
                W/C {new Date(w.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {existingByWeek[w.weekStart] ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
        {autoCvs > 0 && (
          <p className="text-xs text-blue-600 mt-5">
            {autoCvs} CV{autoCvs !== 1 ? 's' : ''} auto-counted from submissions this week
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Development */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Development</h3>
          <div className="space-y-3">
            {([
              ['newClients', 'New Clients'],
              ['signedTerms', 'Signed Terms'],
              ['newRoles', 'New Roles'],
              ['callsMade', 'Calls Made'],
              ['followUps', 'Follow-Ups'],
            ] as [keyof ExistingData, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 whitespace-nowrap">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={fields[key] || ''}
                  onChange={e => setField(key, e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className={`${inputClass} w-28`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery</h3>
          <div className="space-y-3">
            {([
              ['cvs', 'CVs Submitted'],
              ['cvsDeclined', 'CVs Declined'],
              ['firstInterviews', 'First Interviews'],
              ['secondInterviews', 'Second Interviews'],
              ['assessments', 'Assessments'],
              ['declines', 'Declines'],
              ['offers', 'Offers'],
              ['offersDeclined', 'Offers Declined'],
              ['starts', 'Starts'],
            ] as [keyof ExistingData, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 whitespace-nowrap">{label}</label>
                {key === 'cvs' && autoCvs > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-500">{autoCvs} auto</span>
                    <input
                      type="number"
                      min="0"
                      value={fields[key] || ''}
                      onChange={e => setField(key, e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className={`${inputClass} w-28`}
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={fields[key] || ''}
                    onChange={e => setField(key, e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className={`${inputClass} w-28`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-700">Revenue (ZAR)</label>
            <input
              type="number"
              min="0"
              value={fields.revenue || ''}
              onChange={e => setField('revenue', e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="e.g. 850000"
              className={`${inputClass} w-36`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-700">Cost (ZAR)</label>
            <input
              type="number"
              min="0"
              value={fields.cost || ''}
              onChange={e => setField('cost', e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="e.g. 200000"
              className={`${inputClass} w-36`}
            />
          </div>
        </div>
        {(fields.revenue > 0 || fields.cost > 0) && (
          <p className="text-xs text-gray-500 mt-3">
            Net: <span className={`font-semibold ${fields.revenue - fields.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatZAR(fields.revenue - fields.cost)}
            </span>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Week'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
