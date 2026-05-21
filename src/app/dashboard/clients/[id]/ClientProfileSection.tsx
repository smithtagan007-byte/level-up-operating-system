'use client'

import { useState } from 'react'
import { updateClientProfileAction, type ClientProfileData } from '../actions'

const HEALTH_OPTIONS = [
  { value: 'strong', label: 'Strong', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'good', label: 'Good', className: 'bg-blue-100 text-blue-800' },
  { value: 'at_risk', label: 'At Risk', className: 'bg-orange-100 text-orange-800' },
  { value: 'dormant', label: 'Dormant', className: 'bg-gray-100 text-gray-500' },
] as const

function HealthBadge({ health }: { health: string | null }) {
  const opt = HEALTH_OPTIONS.find(o => o.value === health)
  if (!opt) return <span className="text-gray-300 text-sm">—</span>
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${opt.className}`}>
      {opt.label}
    </span>
  )
}

interface ClientProfileSectionProps {
  clientId: string
  initial: ClientProfileData
}

export function ClientProfileSection({ clientId, initial }: ClientProfileSectionProps) {
  const [editing, setEditing] = useState(false)
  const [data, setData] = useState<ClientProfileData>(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof ClientProfileData>(key: K, val: ClientProfileData[K]) {
    setData(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setPending(true)
    setError(null)
    try {
      await updateClientProfileAction(clientId, data)
      setSaved(true)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  function handleCancel() {
    setData(initial)
    setEditing(false)
    setError(null)
  }

  if (!editing) {
    const hasAnyData = data.website || data.linkedin_url || data.location || data.headcount ||
      data.relationship_health || data.relationship_notes || data.culture_notes ||
      data.hiring_preferences || data.fee_percentage || data.payment_terms_days || data.warranty_period_days

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Client Profile</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Edit
          </button>
        </div>

        {!hasAnyData ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No profile information yet.</p>
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              Add profile details →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Company Info */}
            {(data.website || data.linkedin_url || data.location || data.headcount || data.industry) && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Company</p>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {data.industry && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Industry</dt>
                      <dd className="text-gray-900">{data.industry}</dd>
                    </div>
                  )}
                  {data.headcount && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Headcount</dt>
                      <dd className="text-gray-900">{data.headcount.toLocaleString()}</dd>
                    </div>
                  )}
                  {data.location && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Location</dt>
                      <dd className="text-gray-900">{data.location}</dd>
                    </div>
                  )}
                  {data.website && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Website</dt>
                      <dd>
                        <a
                          href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block"
                        >
                          {data.website.replace(/^https?:\/\//, '')}
                        </a>
                      </dd>
                    </div>
                  )}
                  {data.linkedin_url && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">LinkedIn</dt>
                      <dd>
                        <a
                          href={data.linkedin_url.startsWith('http') ? data.linkedin_url : `https://${data.linkedin_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View profile →
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Relationship */}
            {(data.relationship_health || data.relationship_notes || data.culture_notes || data.hiring_preferences) && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Relationship</p>
                <div className="space-y-3">
                  {data.relationship_health && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-24 shrink-0">Health</span>
                      <HealthBadge health={data.relationship_health} />
                    </div>
                  )}
                  {data.relationship_notes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Relationship Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.relationship_notes}</p>
                    </div>
                  )}
                  {data.culture_notes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Culture & Values</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.culture_notes}</p>
                    </div>
                  )}
                  {data.hiring_preferences && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Hiring Preferences</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.hiring_preferences}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Commercial */}
            {(data.fee_percentage || data.payment_terms_days || data.warranty_period_days) && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Commercial</p>
                <dl className="grid grid-cols-3 gap-4 text-sm">
                  {data.fee_percentage != null && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Fee</dt>
                      <dd className="text-gray-900 font-medium">{data.fee_percentage}%</dd>
                    </div>
                  )}
                  {data.payment_terms_days != null && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Payment Terms</dt>
                      <dd className="text-gray-900 font-medium">{data.payment_terms_days} days</dd>
                    </div>
                  )}
                  {data.warranty_period_days != null && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Warranty</dt>
                      <dd className="text-gray-900 font-medium">{data.warranty_period_days} days</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Client Profile</h2>
        <button onClick={handleCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {/* Company */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
              <input
                type="text"
                value={data.industry ?? ''}
                onChange={e => set('industry', e.target.value || null)}
                placeholder="e.g. Financial Services"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Headcount</label>
              <input
                type="number"
                min="1"
                value={data.headcount ?? ''}
                onChange={e => set('headcount', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 250"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input
                type="text"
                value={data.location ?? ''}
                onChange={e => set('location', e.target.value || null)}
                placeholder="e.g. Cape Town, South Africa"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
              <input
                type="text"
                value={data.website ?? ''}
                onChange={e => set('website', e.target.value || null)}
                placeholder="e.g. company.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={data.linkedin_url ?? ''}
                onChange={e => set('linkedin_url', e.target.value || null)}
                placeholder="e.g. linkedin.com/company/name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Relationship */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Relationship</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Relationship Health</label>
            <div className="flex gap-2 flex-wrap">
              {HEALTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('relationship_health', data.relationship_health === opt.value ? null : opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    data.relationship_health === opt.value
                      ? opt.className + ' ring-2 ring-offset-1 ring-gray-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Relationship Notes</label>
            <textarea
              value={data.relationship_notes ?? ''}
              onChange={e => set('relationship_notes', e.target.value || null)}
              rows={3}
              placeholder="How is the relationship? Key contacts, history, communication style…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Culture & Values</label>
            <textarea
              value={data.culture_notes ?? ''}
              onChange={e => set('culture_notes', e.target.value || null)}
              rows={3}
              placeholder="Company culture, values, work environment, what they care about in a candidate…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hiring Preferences</label>
            <textarea
              value={data.hiring_preferences ?? ''}
              onChange={e => set('hiring_preferences', e.target.value || null)}
              rows={3}
              placeholder="What do they look for? Red flags, preferences, interview style, decision process…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
            />
          </div>
        </div>

        {/* Commercial */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Commercial</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fee %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={data.fee_percentage ?? ''}
                onChange={e => set('fee_percentage', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 20"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
              <input
                type="number"
                min="0"
                value={data.payment_terms_days ?? ''}
                onChange={e => set('payment_terms_days', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Warranty (days)</label>
              <input
                type="number"
                min="0"
                value={data.warranty_period_days ?? ''}
                onChange={e => set('warranty_period_days', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 90"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
