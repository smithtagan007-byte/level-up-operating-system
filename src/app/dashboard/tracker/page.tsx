import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const trackerCards = [
  {
    title: 'My Dashboard',
    desc: 'Your active roles, weekly activity, CVs in progress, and forecast revenue — personal view.',
    href: '/dashboard/tracker/recruiter',
    minRole: null,
  },
  {
    title: 'Weekly Entry',
    desc: 'Log your weekly BD and delivery numbers. Saved per week and used across all dashboards.',
    href: '/dashboard/tracker/weekly',
    minRole: null,
  },
  {
    title: 'Role Tracker',
    desc: 'Live performance data per role: CVs, days open, revenue forecast, and next actions.',
    href: '/dashboard/tracker/roles',
    minRole: null,
  },
  {
    title: 'Follow-Ups',
    desc: 'Log and manage all follow-ups across clients, candidates, and roles. Track overdue items.',
    href: '/dashboard/tracker/follow-ups',
    minRole: null,
  },
  {
    title: 'Team Dashboard',
    desc: 'Delivery risk view: stale roles, pending reviews, submission pipeline, and recruiter KPIs.',
    href: '/dashboard/tracker/manager',
    minRole: 'talent_manager',
  },
  {
    title: 'Director Dashboard',
    desc: 'Commercial overview: YTD revenue, weighted forecast, revenue by recruiter and client, hot roles.',
    href: '/dashboard/tracker/director',
    minRole: 'director',
  },
]

export default async function TrackerHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const userRole = profile?.role ?? ''

  function canAccess(minRole: string | null) {
    if (!minRole) return true
    if (minRole === 'talent_manager') return userRole === 'talent_manager' || userRole === 'director'
    if (minRole === 'director') return userRole === 'director'
    return false
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Performance Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live data — powered by OS activity, not manual entry where possible.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trackerCards.map((card) => {
          const accessible = canAccess(card.minRole)
          return (
            <Link
              key={card.href}
              href={accessible ? card.href : '#'}
              className={`bg-white border border-gray-200 rounded-xl p-6 transition-shadow ${
                accessible ? 'hover:shadow-sm cursor-pointer' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <h2 className="text-sm font-semibold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              {!accessible && (
                <p className="text-xs text-gray-400 mt-3 italic">
                  Requires {card.minRole === 'director' ? 'Director' : 'Talent Manager or Director'} role
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
