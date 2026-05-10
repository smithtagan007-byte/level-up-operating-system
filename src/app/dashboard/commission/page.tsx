import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatZAR } from '@/lib/format'
import { CommissionClient } from './CommissionClient'
import type { Placement, Recruiter } from './types'

export default async function CommissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['director', 'talent_manager'].includes(profile.role ?? '')) {
    redirect('/dashboard')
  }

  const [{ data: rawPlacements }, { data: rawRecruiters }] = await Promise.all([
    supabase
      .from('placements')
      .select('*')
      .order('client_invoice_date', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .order('full_name'),
  ])

  const placements = (rawPlacements ?? []) as Placement[]
  const recruiters = (rawRecruiters ?? []) as Recruiter[]

  const totalInvoiced = placements
    .filter(p => p.client_paid)
    .reduce((s, p) => s + Number(p.placement_fee ?? 0), 0)

  const totalCommEarned = placements.reduce((s, p) => s + Number(p.commission_earned ?? 0), 0)
  const totalCommPaid = placements.reduce((s, p) => s + Number(p.commission_paid ?? 0), 0)
  const commOutstanding = totalCommEarned - totalCommPaid
  const totalAdvances = placements.reduce((s, p) => s + Number(p.payroll_advance ?? 0), 0)

  const now = new Date()
  const fyStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  const fyStart = `${fyStartYear}-09-01`
  const fyLabel = `FY${fyStartYear}/${String(fyStartYear + 1).slice(2)}`
  const ytdRevenue = placements
    .filter(p => p.client_paid && p.client_invoice_date && p.client_invoice_date >= fyStart)
    .reduce((s, p) => s + Number(p.placement_fee ?? 0), 0)

  const cards = [
    { label: 'Total Invoiced', value: formatZAR(totalInvoiced), sub: 'Client-paid invoices (all time)', alert: false },
    { label: 'Commission Earned', value: formatZAR(totalCommEarned), sub: 'All time', alert: false },
    { label: 'Commission Paid', value: formatZAR(totalCommPaid), sub: 'All time', alert: false },
    { label: 'Commission Outstanding', value: formatZAR(commOutstanding), sub: 'Earned minus paid', alert: commOutstanding > 0 },
    { label: 'Total Advances', value: formatZAR(totalAdvances), sub: 'Payroll advances (all time)', alert: false },
    { label: 'YTD Net Revenue', value: formatZAR(ytdRevenue), sub: `${fyLabel} paid invoices`, alert: false },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Commission &amp; Invoicing</h1>

      <div className="grid grid-cols-3 gap-4">
        {cards.map(c => (
          <div
            key={c.label}
            className={`bg-white border rounded-xl p-4 ${c.alert ? 'border-red-200' : 'border-gray-200'}`}
          >
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${c.alert ? 'text-red-600' : 'text-gray-900'}`}>
              {c.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <CommissionClient
        placements={placements}
        recruiters={recruiters}
        isDirector={profile.role === 'director'}
      />
    </div>
  )
}
