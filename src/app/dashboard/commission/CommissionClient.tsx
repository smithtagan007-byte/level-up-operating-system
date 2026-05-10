'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatZAR } from '@/lib/format'
import type { Placement, Recruiter } from './types'

interface Props {
  placements: Placement[]
  recruiters: Recruiter[]
  isDirector: boolean
}

const MONTHS = [
  ['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'],
  ['05', 'May'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Aug'],
  ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec'],
] as const

function fmt(n: number | null | undefined) {
  return n != null ? formatZAR(n) : '—'
}

function csvEscape(val: string | number | boolean | null | undefined): string {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function CommissionClient({ placements, recruiters, isDirector }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'placements' | 'recruiters'>('placements')
  const [search, setSearch] = useState('')
  const [filterRecruiter, setFilterRecruiter] = useState('all')
  const [filterPaid, setFilterPaid] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [expandedRecruiter, setExpandedRecruiter] = useState<string | null>(null)

  const userMap = useMemo(
    () => Object.fromEntries(recruiters.map(r => [r.id, r.full_name])),
    [recruiters]
  )

  function getRecruiterName(p: Placement): string {
    if (p.recruiter_id) return userMap[p.recruiter_id] ?? p.staff_name ?? '—'
    return p.staff_name ?? '—'
  }

  function getRecruiterKey(p: Placement): string {
    return p.recruiter_id ?? p.staff_name ?? 'unknown'
  }

  const years = useMemo(() => {
    const s = new Set<string>()
    for (const p of placements) {
      if (p.client_invoice_date) s.add(p.client_invoice_date.slice(0, 4))
    }
    return Array.from(s).sort().reverse()
  }, [placements])

  const recruiterOptions = useMemo(() => {
    const opts = new Map<string, string>()
    for (const p of placements) {
      const key = getRecruiterKey(p)
      if (!opts.has(key)) opts.set(key, getRecruiterName(p))
    }
    return Array.from(opts.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [placements, userMap])

  const filtered = useMemo(() => {
    return placements.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.candidate_name.toLowerCase().includes(q) &&
          !p.client.toLowerCase().includes(q) &&
          !(p.invoice_number ?? '').toLowerCase().includes(q)
        ) return false
      }
      if (filterRecruiter !== 'all' && getRecruiterKey(p) !== filterRecruiter) return false
      if (filterPaid === 'paid' && !p.client_paid) return false
      if (filterPaid === 'unpaid' && p.client_paid) return false
      if (filterYear !== 'all' && !p.client_invoice_date?.startsWith(filterYear)) return false
      if (filterMonth !== 'all' && p.client_invoice_date?.slice(5, 7) !== filterMonth) return false
      return true
    })
  }, [placements, search, filterRecruiter, filterPaid, filterYear, filterMonth, userMap])

  const recruiterStats = useMemo(() => {
    const map = new Map<string, {
      name: string
      placements: number
      feesGenerated: number
      commEarned: number
      commPaid: number
      advances: number
      monthly: Map<string, { count: number; fees: number; earned: number; paid: number }>
    }>()

    for (const p of placements) {
      const key = getRecruiterKey(p)
      const name = getRecruiterName(p)
      if (!map.has(key)) {
        map.set(key, {
          name,
          placements: 0,
          feesGenerated: 0,
          commEarned: 0,
          commPaid: 0,
          advances: 0,
          monthly: new Map(),
        })
      }
      const s = map.get(key)!
      s.placements++
      s.feesGenerated += Number(p.placement_fee ?? 0)
      s.commEarned += Number(p.commission_earned ?? 0)
      s.commPaid += Number(p.commission_paid ?? 0)
      s.advances += Number(p.payroll_advance ?? 0)

      const month = p.commission_month ?? '—'
      if (!s.monthly.has(month)) s.monthly.set(month, { count: 0, fees: 0, earned: 0, paid: 0 })
      const md = s.monthly.get(month)!
      md.count++
      md.fees += Number(p.placement_fee ?? 0)
      md.earned += Number(p.commission_earned ?? 0)
      md.paid += Number(p.commission_paid ?? 0)
    }

    return Array.from(map.values()).sort((a, b) => b.commEarned - a.commEarned)
  }, [placements, userMap])

  function handleExportCSV() {
    const headers = [
      'Invoice Date', 'Invoice No', 'Client', 'Candidate', 'Role', 'Recruiter',
      'Annual CTC', 'Fee %', 'Placement Fee', 'Client Paid',
      'Commission %', 'Commission Earned', 'Commission Month',
      'Commission Paid', 'Outstanding', 'Notes',
    ]
    const rows = filtered.map(p => [
      p.client_invoice_date ?? '',
      p.invoice_number ?? '',
      p.client,
      p.candidate_name,
      p.role_name,
      getRecruiterName(p),
      p.annual_ctc ?? '',
      p.placement_fee_percentage ?? '',
      p.placement_fee ?? '',
      p.client_paid ? 'Yes' : 'No',
      p.commission_percentage ?? '',
      p.commission_earned ?? '',
      p.commission_month ?? '',
      p.commission_paid ?? '',
      Number(p.commission_earned ?? 0) - Number(p.commission_paid ?? 0),
      p.notes ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `placements_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectClass =
    'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(['placements', 'recruiters'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t === 'placements' ? 'Placements' : 'Commission by Recruiter'}
          </button>
        ))}
      </div>

      {/* ── PLACEMENTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'placements' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search candidate, client, invoice…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 w-64"
            />
            <select value={filterRecruiter} onChange={e => setFilterRecruiter(e.target.value)} className={selectClass}>
              <option value="all">All Recruiters</option>
              {recruiterOptions.map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
            <select value={filterPaid} onChange={e => setFilterPaid(e.target.value)} className={selectClass}>
              <option value="all">All Status</option>
              <option value="paid">Client Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={selectClass}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={selectClass}>
              <option value="all">All Months</option>
              {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            {isDirector && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                >
                  Export CSV
                </button>
                <Link
                  href="/dashboard/commission/new"
                  className="text-xs font-medium bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
                >
                  + Add Placement
                </Link>
              </>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    'Invoice Date', 'Invoice No', 'Client', 'Candidate', 'Role', 'Recruiter',
                    'Annual CTC', 'Fee %', 'Placement Fee', 'Paid',
                    'Com %', 'Com Earned', 'Com Month', 'Com Paid', 'Outstanding', 'Notes',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-4 py-8 text-center text-sm text-gray-400">
                      No placements found.{' '}
                      {isDirector && (
                        <Link href="/dashboard/commission/new" className="text-gray-900 underline">
                          Add the first one.
                        </Link>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const outstanding = Number(p.commission_earned ?? 0) - Number(p.commission_paid ?? 0)
                    return (
                      <tr
                        key={p.id}
                        onClick={() => isDirector && router.push(`/dashboard/commission/${p.id}/edit`)}
                        className={`hover:bg-gray-50 transition-colors ${isDirector ? 'cursor-pointer' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-600">
                          {p.client_invoice_date
                            ? new Date(p.client_invoice_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.invoice_number ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-32 truncate">{p.client}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-36 truncate">{p.candidate_name}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{p.role_name}</td>
                        <td className="px-4 py-3 text-gray-600">{getRecruiterName(p)}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">{fmt(p.annual_ctc)}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {p.placement_fee_percentage != null ? `${p.placement_fee_percentage}%` : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">{fmt(p.placement_fee)}</td>
                        <td className="px-4 py-3">
                          {p.client_paid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {p.commission_percentage != null ? `${p.commission_percentage}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-900 tabular-nums">{fmt(p.commission_earned)}</td>
                        <td className="px-4 py-3 text-gray-500">{p.commission_month ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-900 tabular-nums">{fmt(p.commission_paid)}</td>
                        <td
                          className={`px-4 py-3 tabular-nums font-medium ${
                            outstanding > 0
                              ? 'text-red-600'
                              : outstanding < 0
                              ? 'text-amber-600'
                              : 'text-gray-300'
                          }`}
                        >
                          {outstanding !== 0 ? fmt(outstanding) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-40 truncate text-xs">{p.notes ?? ''}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COMMISSION BY RECRUITER TAB ────────────────────────────────────── */}
      {tab === 'recruiters' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    'Recruiter', 'Placements', 'Fees Generated', 'Com Earned',
                    'Com Paid', 'Outstanding', 'Advances', 'Net Owing', '',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recruiterStats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                      No placement data yet.
                    </td>
                  </tr>
                ) : (
                  recruiterStats.map(r => {
                    const outstanding = r.commEarned - r.commPaid
                    const netOwing = outstanding - r.advances
                    const isExpanded = expandedRecruiter === r.name
                    return (
                      <tr
                        key={r.name}
                        onClick={() => setExpandedRecruiter(isExpanded ? null : r.name)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">{r.placements}</td>
                        <td className="px-4 py-3 text-gray-900 tabular-nums">{formatZAR(r.feesGenerated)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">{formatZAR(r.commEarned)}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">{formatZAR(r.commPaid)}</td>
                        <td
                          className={`px-4 py-3 tabular-nums font-medium ${
                            outstanding > 0 ? 'text-red-600' : 'text-gray-300'
                          }`}
                        >
                          {outstanding > 0 ? formatZAR(outstanding) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {r.advances > 0 ? formatZAR(r.advances) : '—'}
                        </td>
                        <td
                          className={`px-4 py-3 tabular-nums font-medium ${
                            netOwing > 0 ? 'text-red-600' : 'text-gray-300'
                          }`}
                        >
                          {netOwing !== 0 ? formatZAR(netOwing) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">
                          {isExpanded ? '▾' : '▸'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Monthly breakdown */}
          {expandedRecruiter && (() => {
            const stats = recruiterStats.find(r => r.name === expandedRecruiter)
            if (!stats) return null
            const months = Array.from(stats.monthly.entries()).sort((a, b) =>
              a[0].localeCompare(b[0])
            )
            return (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Monthly breakdown — {expandedRecruiter}
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Month', 'Placements', 'Fees', 'Com Earned', 'Com Paid', 'Outstanding'].map(h => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {months.map(([month, md]) => {
                        const os = md.earned - md.paid
                        return (
                          <tr key={month} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{month}</td>
                            <td className="px-4 py-3 text-gray-600 tabular-nums">{md.count}</td>
                            <td className="px-4 py-3 text-gray-900 tabular-nums">{formatZAR(md.fees)}</td>
                            <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">{formatZAR(md.earned)}</td>
                            <td className="px-4 py-3 text-gray-600 tabular-nums">{formatZAR(md.paid)}</td>
                            <td
                              className={`px-4 py-3 tabular-nums font-medium ${
                                os > 0 ? 'text-red-600' : 'text-gray-300'
                              }`}
                            >
                              {os > 0 ? formatZAR(os) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
