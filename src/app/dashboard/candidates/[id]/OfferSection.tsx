'use client'

import { useState } from 'react'
import { createOfferAction, updateOfferStatusAction } from './actions'

const STATUS_CONFIG = {
  pending: { label: 'Pending', style: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Accepted', style: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', style: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', style: 'bg-gray-100 text-gray-500' },
} as const

const RISK_CONFIG = {
  low: { label: 'Low', style: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Medium', style: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', style: 'bg-red-100 text-red-700' },
} as const

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Offer {
  id: string
  offered_salary: number | null
  start_date: string | null
  notice_period_days: number | null
  counter_offered: boolean
  status: string
  accepted_at: string | null
  declined_at: string | null
  declined_reason: string | null
  replacement_risk: string | null
  created_at: string
}

interface OfferSectionProps {
  candidateId: string
  roleId: string
  submissionId: string
  offers: Offer[]
}

export function OfferSection({ candidateId, roleId, submissionId, offers }: OfferSectionProps) {
  const activeOffer = offers.find(o => o.status === 'pending') ?? offers[0] ?? null

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    offeredSalary: '',
    startDate: '',
    noticePeriodDays: '',
    replacementRisk: '',
  })

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusForm, setStatusForm] = useState({
    status: 'accepted',
    declinedReason: '',
    counterOffered: false,
    replacementRisk: '',
  })
  const [statusPending, setStatusPending] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  async function handleCreate() {
    setCreatePending(true)
    setCreateError(null)
    try {
      await createOfferAction({
        candidateId, roleId, submissionId,
        offeredSalary: form.offeredSalary ? parseFloat(form.offeredSalary) : undefined,
        startDate: form.startDate || undefined,
        noticePeriodDays: form.noticePeriodDays ? parseInt(form.noticePeriodDays) : undefined,
        replacementRisk: form.replacementRisk || undefined,
      })
      setShowCreateForm(false)
      setForm({ offeredSalary: '', startDate: '', noticePeriodDays: '', replacementRisk: '' })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreatePending(false)
    }
  }

  async function handleStatusUpdate() {
    if (!activeOffer) return
    setStatusPending(true)
    setStatusError(null)
    try {
      await updateOfferStatusAction({
        offerId: activeOffer.id,
        candidateId,
        status: statusForm.status,
        declinedReason: statusForm.declinedReason || undefined,
        counterOffered: statusForm.counterOffered,
        replacementRisk: statusForm.replacementRisk || undefined,
      })
      setUpdatingStatus(false)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setStatusPending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Offer</h2>
        {!activeOffer && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            + Make Offer
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* No offer yet */}
        {!activeOffer && !showCreateForm && (
          <p className="text-sm text-gray-400">No offer made yet.</p>
        )}

        {/* Create offer form */}
        {showCreateForm && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Offer</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Offered Salary</label>
                <input
                  type="number"
                  min="0"
                  value={form.offeredSalary}
                  onChange={e => setForm(f => ({ ...f, offeredSalary: e.target.value }))}
                  placeholder="e.g. 850000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notice Period (days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.noticePeriodDays}
                  onChange={e => setForm(f => ({ ...f, noticePeriodDays: e.target.value }))}
                  placeholder="e.g. 30"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Replacement Risk</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, replacementRisk: f.replacementRisk === r ? '' : r }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        form.replacementRisk === r
                          ? RISK_CONFIG[r].style + ' ring-2 ring-offset-1 ring-gray-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createPending}
                className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {createPending ? 'Saving…' : 'Confirm Offer'}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setCreateError(null) }}
                className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active offer display */}
        {activeOffer && !showCreateForm && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[activeOffer.status as keyof typeof STATUS_CONFIG]?.style ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_CONFIG[activeOffer.status as keyof typeof STATUS_CONFIG]?.label ?? activeOffer.status}
                  </span>
                  {activeOffer.replacement_risk && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RISK_CONFIG[activeOffer.replacement_risk as keyof typeof RISK_CONFIG]?.style ?? 'bg-gray-100 text-gray-600'}`}>
                      {RISK_CONFIG[activeOffer.replacement_risk as keyof typeof RISK_CONFIG]?.label} Replacement Risk
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
                  {activeOffer.offered_salary && (
                    <div>
                      <dt className="text-xs text-gray-400">Salary</dt>
                      <dd className="font-medium text-gray-900">R {activeOffer.offered_salary.toLocaleString()}</dd>
                    </div>
                  )}
                  {activeOffer.start_date && (
                    <div>
                      <dt className="text-xs text-gray-400">Start Date</dt>
                      <dd className="font-medium text-gray-900">{fmt(activeOffer.start_date)}</dd>
                    </div>
                  )}
                  {activeOffer.notice_period_days != null && (
                    <div>
                      <dt className="text-xs text-gray-400">Notice Period</dt>
                      <dd className="font-medium text-gray-900">{activeOffer.notice_period_days} days</dd>
                    </div>
                  )}
                </dl>
                {activeOffer.counter_offered && (
                  <p className="text-xs text-amber-600 font-medium">⚠ Counter-offer received</p>
                )}
                {activeOffer.declined_reason && (
                  <p className="text-xs text-gray-500">Reason: {activeOffer.declined_reason}</p>
                )}
                {activeOffer.accepted_at && (
                  <p className="text-xs text-emerald-600">Accepted on {fmt(activeOffer.accepted_at)}</p>
                )}
                {activeOffer.declined_at && (
                  <p className="text-xs text-red-600">Declined on {fmt(activeOffer.declined_at)}</p>
                )}
              </div>
              {activeOffer.status === 'pending' && !updatingStatus && (
                <button
                  onClick={() => { setUpdatingStatus(true); setStatusForm({ status: 'accepted', declinedReason: '', counterOffered: false, replacementRisk: '' }) }}
                  className="text-xs text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
                >
                  Update
                </button>
              )}
            </div>

            {/* Status update form */}
            {updatingStatus && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Offer Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['accepted', 'declined', 'withdrawn'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusForm(f => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        statusForm.status === s
                          ? STATUS_CONFIG[s].style + ' ring-2 ring-offset-1 ring-gray-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
                {['declined', 'withdrawn'].includes(statusForm.status) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                    <input
                      type="text"
                      value={statusForm.declinedReason}
                      onChange={e => setStatusForm(f => ({ ...f, declinedReason: e.target.value }))}
                      placeholder="Why was the offer declined or withdrawn?"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusForm.counterOffered}
                      onChange={e => setStatusForm(f => ({ ...f, counterOffered: e.target.checked }))}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    Counter-offer received
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Replacement Risk</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setStatusForm(f => ({ ...f, replacementRisk: f.replacementRisk === r ? '' : r }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          statusForm.replacementRisk === r
                            ? RISK_CONFIG[r].style + ' ring-2 ring-offset-1 ring-gray-400'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {statusError && <p className="text-xs text-red-600">{statusError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleStatusUpdate}
                    disabled={statusPending}
                    className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {statusPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setUpdatingStatus(false); setStatusError(null) }}
                    className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
