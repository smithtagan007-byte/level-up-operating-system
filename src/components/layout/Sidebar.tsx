'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainNav = [
  { label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { label: 'Clients', href: '/dashboard/clients', icon: '🏢' },
  { label: 'Roles', href: '/dashboard/roles', icon: '📋' },
  { label: 'Candidates', href: '/dashboard/candidates', icon: '👤' },
  { label: 'Internal Reviews', href: '/dashboard/internal-reviews', icon: '✓' },
  { label: 'Prompt Library', href: '/dashboard/prompts', icon: '💬' },
  { label: 'Operating Manual', href: '/dashboard/manual', icon: '📖' },
  { label: 'KPIs', href: '/dashboard/kpis', icon: '📊' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
]

const financeNav = [
  { label: 'Commission', href: '/dashboard/commission', minRole: 'talent_manager' as const },
]

const trackerNav = [
  { label: 'Weekly Entry', href: '/dashboard/tracker/weekly', minRole: null },
  { label: 'Self-Review', href: '/dashboard/recruiter/self-review', minRole: null },
  { label: 'Role Tracker', href: '/dashboard/tracker/roles', minRole: null },
  { label: 'Follow-Ups', href: '/dashboard/tracker/follow-ups', minRole: null },
  { label: 'Team Dashboard', href: '/dashboard/tracker/manager', minRole: 'talent_manager' },
  { label: 'Director Dashboard', href: '/dashboard/tracker/director', minRole: 'director' },
]

function canSeeLink(userRole: string, minRole: string | null): boolean {
  if (!minRole) return true
  if (minRole === 'talent_manager') return userRole === 'talent_manager' || userRole === 'director'
  if (minRole === 'director') return userRole === 'director'
  return false
}

interface SidebarProps {
  userRole?: string
}

export function Sidebar({ userRole = '' }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-sm font-semibold tracking-widest uppercase text-gray-400">Level Up</span>
        <p className="text-xs text-gray-500 mt-0.5">Operating System</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-gray-700 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Finance section */}
        {financeNav.some(item => canSeeLink(userRole, item.minRole)) && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Finance</p>
            </div>
            {financeNav.filter(item => canSeeLink(userRole, item.minRole)).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-700 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">📈</span>
                {item.label}
              </Link>
            ))}
          </>
        )}

        {/* Tracker section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-widest text-gray-600">Tracker</p>
        </div>
        {trackerNav.filter(item => canSeeLink(userRole, item.minRole)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-gray-700 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">◈</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-2 rounded-md hover:bg-gray-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
