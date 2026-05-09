'use client'

import { useState, useMemo, useTransition } from 'react'
import { upsertRoleRevenueAction } from '../revenue-actions'
import { PlacementModal } from './PlacementModal'
import { ClosedLostModal } from './ClosedLostModal'
import { formatZAR } from '@/lib/format'

interface ExistingRevenue {
  fee_type: string
  placement_fee_percentage: number | null
  fixed_fee_amount: number | null
  salary_basis: string | null
  estimated_candidate_ctc: number | null
  potential_revenue: number | null
  forecast_probability: number | null
  weighted_forecast_revenue: number | null
  actual_placement_ctc: number | null
  actual_revenue: number | null
  revenue_variance: number | null
  revenue_status: string
  invoice_status: string
  closed_lost_reason: string | null
  lost_revenue: number | null
  manual_override: boolean
  notes: string | null
}

interface Props {
  roleId: string
  existing: ExistingRevenue | null
}

const REV_STATUS_STYLES: Record<string, string> = {
  Forecast: 'bg-gray-100 text-gray-600',
  Hot: 'bg-amber-100 text-amber-800',
  Placed: 'bg-emerald-100 text-emerald-800',
  'Closed Lost': 'bg-red-100 text-red-700',
  Invoiced: 'bg-blue-100 text-blue-700',
  Paid: 'bg-emerald-200 text-emerald-900',
}

const PROB_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.50 },
  { label: '75%', value: 0.75 },
  { label: '90%', value: 0.90 },
]

const STATUSES = ['Forecast', 'Hot', 'Placed', 'Closed Lost', 'Invoiced', 'Paid']

export function RoleRevenueSection({ roleId, existing }: Props) {
  const [feeType, setFeeType] = useState<'percentage' | 'fixed'>((existing?.fee_type as 'percentage' | 'fixed') ?? 'percentage')
  const [feePercentage, setFeePercentage] = useState(existing?.placement_fee_percentage ?? 15)
  const [fixedFeeAmount, setFixedFeeAmount] = useState<string>(existing?.fixed_fee_amount != null ? String(existing.fixed_fee_amount) : '')
  const [salaryBasis, setSalaryBasis] = useState(existing?.salary_basis ?? 'Annual CTC')
  const [estimatedCTC, setEstimatedCTC] = useState<string>(existing?.estimated_candidate_ctc != null ? String(existing.estimated_candidate_ctc) : '')
  const [manualOverride, setManualOverride] = useState(existing?.manual_override ?? false)
  const [manualPotential, setManualPotential] = useState<string>(existing?.potential_revenue != null ? String(existing.potential_revenue) : '')
  const [forecastProb, setForecastProb] = useState<number | null>(existing?.forecast_probability ?? null)
  const [revenueStatus, setRevenueStatus] = useState(existing?.revenue_status ?? 'Forecast')
  const [notes, setNotes] = useState(existing?.notes ?? '')

  // Placement modal state
  const [showPlacement, setShowPlacement] = useState(false)
  const [showClosedLost, setShowClosedLost] = useState(false)
  const [actualPlacementCTC, setActualPlacementCTC] = useState<number | null>(existing?.actual_placement_ctc ?? null)
  const [actualRevenue, setActualRevenue] = useState<number | null>(existing?.actual_revenue ?? null)
  const [invoiceStatus, setInvoiceStatus] = useState(existing?.invoice_status ?? 'Not Invoiced')
  const [closedLostReason, setClosedLostReason] = useState(existing?.closed_lost_reason ?? '')
  const [lostRevenue, setLostRevenue] = useState<number | null>(existing?.lost_revenue ?? null)

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const calculatedPotential = useMemo(() => {
    if (feeType === 'percentage') {
      const ctc = Number(estimatedCTC)
      const pct = Number(feePercentage)
      if (ctc > 0 && pct > 0) return ctc * (pct / 100)
    }
    if (feeType === 'fixed') {
      const amt = Number(fixedFeeAmount)
      if (amt > 0) return amt
    }
    return null
  }, [feeType, estimatedCTC, feePercentage, fixedFeeAmount])

  const potentialRevenue = manualOverride && manualPotential ? Number(manualPotential) : calculatedPotential
  const weightedForecast = potentialRevenue != null && forecastProb != null ? potentialRevenue * forecastProb : null

  // Compute variance for display (placed roles)
  const variance = actualRevenue != null && potentialRevenue != null ? actualRevenue - potentialRevenue : (existing?.revenue_variance ?? null)

  function handleStatusChange(newStatus: string) {
    setError(null)
    if (newStatus === 'Hot' && !forecastProb) {
      setError('Set a forecast probability before marking this role as Hot.')
      return
    }
    if (newStatus === 'Placed') {
      setShowPlacement(true)
      return
    }
    if (newStatus === 'Closed Lost') {
      setShowClosedLost(true)
      return
    }
    setRevenueStatus(newStatus)
  }

  function buildPayload(overrides?: Partial<{
    revenueStatus: string
    actualPlacementCTC: number | null
    actualRevenue: number | null
    invoiceStatus: string
    closedLostReason: string
    lostRevenue: number | null
  }>) {
    return {
      feeType,
      feePercentage: Number(feePercentage),
      fixedFeeAmount: fixedFeeAmount ? Number(fixedFeeAmount) : null,
      salaryBasis,
      estimatedCTC: estimatedCTC ? Number(estimatedCTC) : null,
      manualOverride,
      potentialRevenue: manualOverride && manualPotential ? Number(manualPotential) : null,
      forecastProbability: forecastProb,
      revenueStatus: overrides?.revenueStatus ?? revenueStatus,
      actualPlacementCTC: overrides?.actualPlacementCTC ?? actualPlacementCTC,
      actualRevenue: overrides?.actualRevenue ?? actualRevenue,
      invoiceStatus: overrides?.invoiceStatus ?? invoiceStatus,
      closedLostReason: overrides?.closedLostReason ?? closedLostReason,
      lostRevenue: overrides?.lostRevenue ?? lostRevenue,
      notes,
    }
  }

  function save(overrides?: Parameters<typeof buildPayload>[0]) {
    setError(null)
    setWarning(null)
    setSaved(false)
    const payload = buildPayload(overrides)
    const computedPotential = manualOverride ? payload.potentialRevenue : calculatedPotential
    if (!computedPotential) {
      setWarning('Potential revenue is not set. You can continue, but revenue forecasting will be incomplete.')
    }
    startTransition(async () => {
      try {
        await upsertRoleRevenueAction(roleId, payload)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <>
      {showPlacement && (
        <PlacementModal
          potentialRevenue={potentialRevenue}
          feeType={feeType}
          feePercentage={Number(feePercentage)}
          fixedFeeAmount={fixedFeeAmount ? Number(fixedFeeAmount) : null}
          onConfirm={data => {
            setActualPlacementCTC(data.actualPlacementCTC)
            setActualRevenue(data.actualRevenue)
            setInvoiceStatus(data.invoiceStatus)
            setRevenueStatus('Placed')
            setShowPlacement(false)
            save({ revenueStatus: 'Placed', actualPlacementCTC: data.actualPlacementCTC, actualRevenue: data.actualRevenue, invoiceStatus: data.invoiceStatus })
          }}
          onCancel={() => setShowPlacement(false)}
        />
      )}

      {showClosedLost && (
        <ClosedLostModal
          potentialRevenue={potentialRevenue}
          onConfirm={data => {
            setClosedLostReason(data.reason)
            setLostRevenue(data.lostRevenue)
            setNotes(data.notes || notes)
            setRevenueStatus('Closed Lost')
            setShowClosedLost(false)
            save({ revenueStatus: 'Closed Lost', closedLostReason: data.reason, lostRevenue: data.lostRevenue })
          }}
          onCancel={() => setShowClosedLost(false)}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Revenue</h2>
          {revenueStatus && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REV_STATUS_STYLES[revenueStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {revenueStatus}
            </span>
          )}
        </div>

        {/* Fee type toggle */}
        <div>
          <p className={labelClass}>Fee Type</p>
          <div className="flex gap-2">
            {(['percentage', 'fixed'] as const).map(ft => (
              <button
                key={ft}
                type="button"
                onClick={() => setFeeType(ft)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  feeType === ft ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ft === 'percentage' ? 'Percentage' : 'Fixed Fee'}
              </button>
            ))}
          </div>
        </div>

        {feeType === 'percentage' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fee Percentage (%)</label>
              <input type="number" min="1" max="100" value={feePercentage} onChange={e => setFeePercentage(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Salary Basis</label>
              <select value={salaryBasis} onChange={e => setSalaryBasis(e.target.value)} className={`${inputClass} bg-white`}>
                {['Annual CTC', 'Monthly CTC', 'Basic Salary', 'Fixed Fee'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Estimated Candidate CTC (ZAR)</label>
              <input type="number" value={estimatedCTC} onChange={e => setEstimatedCTC(e.target.value)} placeholder="e.g. 850000" className={inputClass} />
            </div>
          </div>
        ) : (
          <div>
            <label className={labelClass}>Fixed Fee Amount (ZAR)</label>
            <input type="number" value={fixedFeeAmount} onChange={e => setFixedFeeAmount(e.target.value)} placeholder="e.g. 45000" className={inputClass} />
          </div>
        )}

        {/* Potential revenue */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass.replace(' mb-1', '')}>Potential Revenue</label>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={manualOverride} onChange={e => setManualOverride(e.target.checked)} className="rounded border-gray-300" />
              Manual override
            </label>
          </div>
          {manualOverride ? (
            <input type="number" value={manualPotential} onChange={e => setManualPotential(e.target.value)} placeholder="e.g. 127500" className={inputClass} />
          ) : (
            <div className={`${inputClass} bg-gray-50 text-gray-600`}>
              {potentialRevenue != null ? formatZAR(potentialRevenue) : <span className="text-gray-400">— Set fee details above to calculate</span>}
            </div>
          )}
        </div>

        {/* Forecast probability */}
        <div>
          <p className={labelClass}>Forecast Probability</p>
          <div className="flex gap-2">
            {PROB_OPTIONS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForecastProb(forecastProb === p.value ? null : p.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  forecastProb === p.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weighted forecast */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Weighted Forecast Revenue</span>
          <span className={`font-semibold text-sm ${weightedForecast != null ? 'text-emerald-700' : 'text-gray-300'}`}>
            {weightedForecast != null ? formatZAR(weightedForecast) : '—'}
          </span>
        </div>

        {/* Placed data (if already placed) */}
        {(revenueStatus === 'Placed' || revenueStatus === 'Invoiced' || revenueStatus === 'Paid') && actualRevenue != null && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Actual Revenue</span>
              <span className="font-semibold text-emerald-700">{formatZAR(actualRevenue)}</span>
            </div>
            {variance != null && (
              <div className="flex justify-between">
                <span className="text-gray-600">Variance vs Potential</span>
                <span className={`font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {variance >= 0 ? '+' : ''}{formatZAR(variance)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Status</span>
              <span className="text-gray-700">{invoiceStatus}</span>
            </div>
          </div>
        )}

        {/* Closed lost data */}
        {revenueStatus === 'Closed Lost' && closedLostReason && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm">
            <p className="font-medium text-red-700 mb-1">Closed Lost</p>
            <p className="text-red-600">{closedLostReason}</p>
            {lostRevenue != null && (
              <p className="text-red-500 mt-1">Lost revenue: {formatZAR(lostRevenue)}</p>
            )}
          </div>
        )}

        {/* Revenue status */}
        <div>
          <p className={labelClass}>Revenue Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  revenueStatus === s
                    ? `${REV_STATUS_STYLES[s]} ring-2 ring-offset-1 ring-gray-400`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" className={`${inputClass} resize-none`} />
        </div>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">{warning}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            onClick={() => save()}
            disabled={isPending}
            className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Revenue'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
        </div>
      </div>
    </>
  )
}
