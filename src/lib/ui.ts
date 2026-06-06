/**
 * Shared UI class strings — import these instead of duplicating Tailwind classes.
 * This is the single source of truth for the design system.
 */

// Buttons
export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors',
  secondary: 'inline-flex items-center justify-center gap-2 text-sm text-gray-600 font-medium border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors',
  ghost: 'inline-flex items-center justify-center gap-2 text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 transition-colors',
  danger: 'inline-flex items-center justify-center gap-2 text-sm text-red-600 font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors',
  link: 'text-sm text-gray-500 hover:text-gray-900 transition-colors',
}

// Cards
export const card = {
  base: 'bg-white border border-gray-200 rounded-xl',
  padded: 'bg-white border border-gray-200 rounded-xl p-5',
  compact: 'bg-white border border-gray-200 rounded-xl p-4',
}

// Form inputs
export const input = {
  base: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
  select: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent',
  textarea: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none',
  label: 'block text-xs font-semibold text-gray-600 mb-1.5',
}

// Tables
export const table = {
  wrapper: 'bg-white border border-gray-200 rounded-xl overflow-x-auto',
  th: 'text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide',
  td: 'px-5 py-3.5 text-sm',
  tr: 'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
  head: 'border-b border-gray-100 bg-gray-50/70',
}

// Page layout
export const page = {
  header: 'flex items-start justify-between mb-6',
  h1: 'text-2xl font-semibold text-gray-900',
  subtitle: 'text-sm text-gray-500 mt-0.5',
  section: 'space-y-4',
}

// Badges
export const badge = {
  green: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800',
  yellow: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',
  red: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
  blue: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700',
  gray: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600',
  purple: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700',
}

// Empty state
export const empty = {
  wrapper: 'bg-white border border-gray-200 rounded-xl p-12 text-center',
  icon: 'mx-auto mb-4 text-gray-300',
  title: 'text-sm font-semibold text-gray-700 mb-1',
  body: 'text-sm text-gray-400 mb-4',
}
