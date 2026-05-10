'use client'

import { useState, useMemo } from 'react'
import { formatZAR } from '@/lib/format'

interface Props {
  potentialRevenue: number | null
  feeType: 'percentage' | 'fixed'
  feePercentage: number
  fixedFeeAmount: number | null
  onConfirm: (data: { actualPlacementCTC: number | null; actualRevenue: number; invoiceStatus: string }) => void
  onCancel: () => void
}

export function PlacementModal({ potentialRevenue, feeType, feePercentage, fixedFeeAmount, onConfirm, onCancel }: Props) {
  const [actualCTC, setActualCTC] = useState<string>('')
  const [manualRevenue, setManualRevenue] = useState<string>('')
  const [invoiceStatus, setInvoiceStatus] = useState('Not Invoiced')

  const calculatedRevenue = useMemo(() => {
    if (feeType === 'percentage' && actualCTC && feePercentage) {
      return Number(actualCTC) * (feePercentage / 100)
    }
    if (feeType === 'fixed' && fixedFeeAmount) {
      return fixedFeeAmount
    }
    return null
  }, [feeType, actualCTC, feePercentage, fixedFeeAmount])

  const displayRevenue = manualRevenue !== '' ? Number(manualRevenue) : calculatedRevenue
  const variance = displayRevenue != null && potentialRevenue != null ? displayRevenue - potentialRevenue : null

  function handleConfirm() {
    if (!displayRevenue) return
    onConfirm({
      actualPlacementCTC: actualCTC ? Number(actualCTC) : null,
      actualRevenue: displayRevenue,
      invoiceStatus,
    })
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Confirm Placement</h2>
            <p className="text-xs text-gray-500 mt-0.5">Record the actual placement details</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {feeType === 'percentage' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Actual Candidate CTC (ZAR)</label>
              <input
                type="number"
                value={actualCTC}
                onChange={e => { setActualCTC(e.target.value); setManualRevenue('') }}
                placeholder="e.g. 850000"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Actual Revenue (ZAR)
              {calculatedRevenue != null && <span className="text-gray-400 ml-1">auto-calculated</span>}
            </label>
            <input
              type="number"
              value={manualRevenue !== '' ? manualRevenue : (calculatedRevenue ?? '')}
              onChange={e => setManualRevenue(e.target.value)}
              placeholder="e.g. 127500"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Status</label>
            <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)} className={`${inputClass} bg-white`}>
              {['Not Invoiced', 'Invoice Raised', 'Invoice Sent', 'Partially Paid', 'Paid', 'Written Off'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {potentialRevenue != null && displayRevenue != null && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Potential revenue</span>
                <span className="text-gray-700">{formatZAR(potentialRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actual revenue</span>
                <span className="font-medium text-gray-900">{formatZAR(displayRevenue)}</span>
              </div>
              {variance != null && (
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-500">Variance</span>
                  <span className={`font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variance >= 0 ? '+' : ''}{formatZAR(variance)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={!displayRevenue}
              className="bg-emerald-700 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-40 transition-colors"
            >
              Confirm Placement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
