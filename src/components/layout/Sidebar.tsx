'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Bell,
  ClipboardCheck,
  Building2,
  CalendarDays,
  BarChart3,
  TrendingUp,
  Banknote,
  Lightbulb,
  BookOpen,
  Settings,
  Star,
  ChevronRight,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  minRole?: 'talent_manager' | 'director' | null
}

const pipelineNav: NavItem[] = [
  { label: 'Roles', href: '/dashboard/roles', icon: Briefcase },
  { label: 'Candidates', href: '/dashboard/candidates', icon: Users },
  { label: 'Follow-Ups', href: '/dashboard/tracker/follow-ups', icon: Bell },
  { label: 'Internal Reviews', href: '/dashboard/internal-reviews', icon: ClipboardCheck },
]

const clientsNav: NavItem[] = [
  { label: 'Clients', href: '/dashboard/clients', icon: Building2 },
]

const performanceNav: NavItem[] = [
  { label: 'Weekly Entry', href: '/dashboard/tracker/weekly', icon: CalendarDays },
  { label: 'Self-Review', href: '/dashboard/recruiter/self-review', icon: Star },
  { label: 'Role Tracker', href: '/dashboard/tracker/roles', icon: BarChart3 },
  { label: 'KPIs', href: '/dashboard/kpis', icon: TrendingUp },
  { label: 'Commission', href: '/dashboard/commission', icon: Banknote, minRole: 'talent_manager' },
  { label: 'Team View', href: '/dashboard/tracker/manager', icon: Users, minRole: 'talent_manager' },
  { label: 'Director View', href: '/dashboard/tracker/director', icon: TrendingUp, minRole: 'director' },
]

const resourcesNav: NavItem[] = [
  { label: 'Prompt Library', href: '/dashboard/prompts', icon: Lightbulb },
  { label: 'Operating Manual', href: '/dashboard/manual', icon: BookOpen },
]

function canSee(userRole: string, minRole?: 'talent_manager' | 'director' | null): boolean {
  if (!minRole) return true
  if (minRole === 'talent_manager') return userRole === 'talent_manager' || userRole === 'director'
  if (minRole === 'director') return userRole === 'director'
  return false
}

const roleLabels: Record<string, string> = {
  talent_specialist: 'Specialist',
  talent_manager: 'Manager',
  director: 'Director',
}

const roleColors: Record<string, string> = {
  talent_specialist: 'bg-gray-700 text-gray-300',
  talent_manager: 'bg-blue-900 text-blue-300',
  director: 'bg-purple-900 text-purple-300',
}

interface SidebarProps {
  userRole?: string
  userName?: string
}

export function Sidebar({ userRole = '', userName = '' }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  function NavLink({ item }: { item: NavItem }) {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
          active
            ? 'bg-gray-800 text-white font-medium'
            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
        }`}
      >
        <Icon size={15} className={active ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} strokeWidth={active ? 2 : 1.5} />
        {item.label}
      </Link>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return (
      <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-600 select-none">
        {label}
      </p>
    )
  }

  const firstName = userName?.split(' ')[0] ?? ''
  const roleLabel = roleLabels[userRole] ?? userRole
  const roleBadge = roleColors[userRole] ?? 'bg-gray-700 text-gray-300'

  return (
    <aside className="w-56 shrink-0 bg-gray-950 flex flex-col min-h-screen border-r border-gray-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-800/60">
        <span className="text-sm font-bold tracking-wider text-white">LEVEL UP</span>
        <p className="text-xs text-gray-500 mt-0.5 tracking-wide">Operating System</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {/* Dashboard — standalone top item */}
        <NavLink item={{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }} />

        {/* Pipeline */}
        <SectionLabel label="Pipeline" />
        {pipelineNav.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Clients */}
        <SectionLabel label="Clients" />
        {clientsNav.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Performance */}
        <SectionLabel label="Performance" />
        {performanceNav.filter(item => canSee(userRole, item.minRole)).map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Resources */}
        <SectionLabel label="Resources" />
        {resourcesNav.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-800/60 px-3 py-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
            {firstName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{firstName || 'Agent'}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive('/dashboard/settings')
              ? 'bg-gray-800 text-white'
              : 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-300'
          }`}
        >
          <Settings size={14} strokeWidth={1.5} />
          Settings
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-800/60 hover:text-gray-300 transition-colors"
          >
            <ChevronRight size={14} strokeWidth={1.5} className="rotate-180" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
