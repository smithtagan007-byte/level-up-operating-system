'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPlacementAction, updatePlacementAction } from './actions'
import type { PlacementPayload } from './actions'
import type { Recruiter } from './types'

interface Props {
  mode: 'new' | 'edit'
  placementId?: string
  initialData?: Partial<PlacementPayload>
  recruiters: Recruiter[]
}

type FieldKey = keyof typeof defaultFields

const defaultFields = {
  recruiter_id: '',
  staff_name: '',
  client_invoice_date: '',
  client: '',
  candidate_name: '',
  role_name: '',
  start_date: '',
  annual_ctc: '',
  placement_fee_percentage: '12',
  placement_fee: '',
  invoice_number: '',
  client_paid: false as boolean,
  commission_percentage: '',
  commission_earned: '',
  commission_month: '',
  payroll_month: '',
  commission_paid: '0',
  ts_earned: '0',
  payroll_commission: '0',
  payroll_advance: '0',
  advance_paid: '0',
  notes: '',
}

type Fields = typeof defaultFields

export function PlacementForm({ mode, placementId, initialData, recruiters }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState<Fields>({
    recruiter_id: initialData?.recruiter_id ?? '',
    staff_name: initialData?.staff_name ?? '',
    client_invoice_date: initialData?.client_invoice_date ?? '',
    client: initialData?.client ?? '',
    candidate_name: initialData?.candidate_name ?? '',
    role_name: initialData?.role_name ?? '',
    start_date: initialData?.start_date ?? '',
    annual_ctc: initialData?.annual_ctc != null ? String(initialData.annual_ctc) : '',
    placement_fee_percentage:
      initialData?.placement_fee_percentage != null ? String(initialData.placement_fee_percentage) : '12',
    placement_fee: initialData?.placement_fee != null ? String(initialData.placement_fee) : '',
    invoice_number: initialData?.invoice_number ?? '',
    client_paid: initialData?.client_paid ?? false,
    commission_percentage:
      initialData?.commission_percentage != null ? String(initialData.commission_percentage) : '',
    commission_earned: initialData?.commission_earned != null ? String(initialData.commission_earned) : '',
    commission_month: initialData?.commission_month ?? '',
    payroll_month: initialData?.payroll_month ?? '',
    commission_paid: initialData?.commission_paid != null ? String(initialData.commission_paid) : '0',
    ts_earned: initialData?.ts_earned != null ? String(initialData.ts_earned) : '0',
    payroll_commission: initialData?.payroll_commission != null ? String(initialData.payroll_commission) : '0',
    payroll_advance: initialData?.payroll_advance != null ? String(initialData.payroll_advance) : '0',
    advance_paid: initialData?.advance_paid != null ? String(initialData.advance_paid) : '0',
    notes: initialData?.notes ?? '',
  })

  function set(key: FieldKey, value: string | boolean) {
    setFields(prev => {
      const next = { ...prev, [key]: value } as Fields

      // Recalculate placement_fee when CTC or fee% changes
      if (key === 'annual_ctc' || key === 'placement_fee_percentage') {
        const ctc = parseFloat(key === 'annual_ctc' ? String(value) : prev.annual_ctc) || 0
        const pct = parseFloat(key === 'placement_fee_percentage' ? String(value) : prev.placement_fee_percentage) || 0
        const fee = Math.round(ctc * pct / 100)
        next.placement_fee = fee > 0 ? String(fee) : ''

        // Cascade to commission_earned
        const comPct = parseFloat(prev.commission_percentage) || 0
        if (comPct > 0 && fee > 0) {
          next.commission_earned = String(Math.round(fee * comPct / 100))
        }
      }

      // Recalculate commission_earned when placement_fee or commission% changes
      if (key === 'placement_fee' || key === 'commission_percentage') {
        const fee = parseFloat(key === 'placement_fee' ? String(value) : prev.placement_fee) || 0
        const comPct = parseFloat(key === 'commission_percentage' ? String(value) : prev.commission_percentage) || 0
        if (fee > 0 && comPct > 0) {
          next.commission_earned = String(Math.round(fee * comPct / 100))
        }
      }

      return next
    })
  }

  const outstanding =
    (parseFloat(fields.commission_earned) || 0) - (parseFloat(fields.commission_paid) || 0)

  function num(v: string): number | null {
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  function buildPayload(): PlacementPayload {
    return {
      staff_name: fields.staff_name || null,
      recruiter_id: fields.recruiter_id || null,
      client_invoice_date: fields.client_invoice_date || null,
      client: fields.client,
      candidate_name: fields.candidate_name,
      role_name: fields.role_name,
      start_date: fields.start_date || null,
      annual_ctc: num(fields.annual_ctc),
      placement_fee_percentage: num(fields.placement_fee_percentage),
      placement_fee: num(fields.placement_fee),
      invoice_number: fields.invoice_number || null,
      client_paid: fields.client_paid,
      commission_percentage: num(fields.commission_percentage),
      commission_earned: num(fields.commission_earned),
      commission_month: fields.commission_month || null,
      payroll_month: fields.payroll_month || null,
      commission_paid: num(fields.commission_paid) ?? 0,
      ts_earned: num(fields.ts_earned) ?? 0,
      payroll_commission: num(fields.payroll_commission) ?? 0,
      payroll_advance: num(fields.payroll_advance) ?? 0,
      advance_paid: num(fields.advance_paid) ?? 0,
      notes: fields.notes || null,
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const payload = buildPayload()
        if (mode === 'new') {
          await createPlacementAction(payload)
        } else {
          await updatePlacementAction(placementId!, payload)
        }
        router.push('/dashboard/commission')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save placement.')
      }
    })
  }

  const input =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
  const label = 'block text-xs font-medium text-gray-600 mb-1'
  const section = 'bg-white border border-gray-200 rounded-xl p-6'
  const sectionTitle = 'text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'new' ? 'Add Placement' : 'Edit Placement'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">All currency values in ZAR.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/commission')}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Placement Details */}
        <div className={section}>
          <h2 className={sectionTitle}>Placement Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={label}>Recruiter</label>
              <div className="flex gap-2">
                <select
                  value={fields.recruiter_id}
                  onChange={e => set('recruiter_id', e.target.value)}
                  className={input}
                >
                  <option value="">— Select from system —</option>
                  {recruiters.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter name manually"
                  value={fields.staff_name}
                  onChange={e => set('staff_name', e.target.value)}
                  className={input}
                />
              </div>
            </div>
            <div>
              <label className={label}>Client Invoice Date</label>
              <input
                type="date"
                value={fields.client_invoice_date}
                onChange={e => set('client_invoice_date', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Start Date</label>
              <input
                type="date"
                value={fields.start_date}
                onChange={e => set('start_date', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Client *</label>
              <input
                type="text"
                required
                value={fields.client}
                onChange={e => set('client', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Candidate Name *</label>
              <input
                type="text"
                required
                value={fields.candidate_name}
                onChange={e => set('candidate_name', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Role Name *</label>
              <input
                type="text"
                required
                value={fields.role_name}
                onChange={e => set('role_name', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Invoice Number</label>
              <input
                type="text"
                value={fields.invoice_number}
                onChange={e => set('invoice_number', e.target.value)}
                className={input}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fields.client_paid}
                  onChange={e => set('client_paid', e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700 font-medium">Client Paid</span>
              </label>
            </div>
          </div>
        </div>

        {/* Fee Calculation */}
        <div className={section}>
          <h2 className={sectionTitle}>Fee Calculation</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Annual CTC (R)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={fields.annual_ctc}
                onChange={e => set('annual_ctc', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Placement Fee %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={fields.placement_fee_percentage}
                onChange={e => set('placement_fee_percentage', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={`${label} flex items-center gap-1`}>
                Placement Fee (R)
                <span className="text-gray-400 font-normal">auto</span>
              </label>
              <input
                type="number"
                step="1"
                value={fields.placement_fee}
                onChange={e => set('placement_fee', e.target.value)}
                className={input}
              />
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className={section}>
          <h2 className={sectionTitle}>Commission</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Commission %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={fields.commission_percentage}
                onChange={e => set('commission_percentage', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={`${label} flex items-center gap-1`}>
                Commission Earned (R)
                <span className="text-gray-400 font-normal">auto</span>
              </label>
              <input
                type="number"
                step="1"
                value={fields.commission_earned}
                onChange={e => set('commission_earned', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Commission Month</label>
              <input
                type="text"
                placeholder="e.g. Jan-26"
                value={fields.commission_month}
                onChange={e => set('commission_month', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Payroll Month</label>
              <input
                type="text"
                placeholder="e.g. Feb-26"
                value={fields.payroll_month}
                onChange={e => set('payroll_month', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Commission Paid (R)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={fields.commission_paid}
                onChange={e => set('commission_paid', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={`${label} flex items-center gap-1`}>
                Outstanding (R)
                <span className="text-gray-400 font-normal">calculated</span>
              </label>
              <div
                className={`${input} bg-gray-50 cursor-default ${
                  outstanding > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'
                }`}
              >
                {outstanding !== 0
                  ? `R ${outstanding.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`
                  : 'R 0'}
              </div>
            </div>
          </div>
        </div>

        {/* Payroll */}
        <div className={section}>
          <h2 className={sectionTitle}>Payroll</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>TS Earned (R)</label>
              <input
                type="number"
                step="1"
                value={fields.ts_earned}
                onChange={e => set('ts_earned', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Payroll Commission (R)</label>
              <input
                type="number"
                step="1"
                value={fields.payroll_commission}
                onChange={e => set('payroll_commission', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Payroll Advance (R)</label>
              <input
                type="number"
                step="1"
                value={fields.payroll_advance}
                onChange={e => set('payroll_advance', e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Advance Paid (R)</label>
              <input
                type="number"
                step="1"
                value={fields.advance_paid}
                onChange={e => set('advance_paid', e.target.value)}
                className={input}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className={section}>
          <label className={label}>Notes</label>
          <textarea
            value={fields.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className={input}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : mode === 'new' ? 'Add Placement' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/commission')}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
