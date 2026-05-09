import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  const roleLabel: Record<string, string> = {
    director: 'Director',
    talent_manager: 'Talent Manager',
    talent_specialist: 'Talent Specialist',
  }

  const userRole = profile?.role ?? ''

  // Fetch base counts in parallel
  const [
    { count: clientCount },
    { count: openRoleCount },
    { count: candidateCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('roles').select('*', { count: 'exact', head: true }).not('status', 'eq', 'closed'),
    supabase.from('candidates').select('*', { count: 'exact', head: true }),
  ])

  // Fetch pending review count separately — depends on confirmed user role
  let pendingReviewCount = 0

  if (userRole === 'talent_manager' || userRole === 'director') {
    const { count } = await supabase
      .from('internal_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('talent_manager_status', 'pending')
    pendingReviewCount = count ?? 0
  } else if (userRole === 'talent_specialist') {
    // CO panel is for the recruiter assigned to each client.
    // Walk: user → owned clients → roles for those clients → pending CO reviews.
    const { data: ownedClients } = await supabase
      .from('clients')
      .select('id')
      .eq('owner_id', user!.id)

    if (ownedClients?.length) {
      const { data: clientRoles } = await supabase
        .from('roles')
        .select('id')
        .in('client_id', ownedClients.map(c => c.id))

      if (clientRoles?.length) {
        const { count } = await supabase
          .from('internal_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('client_owner_status', 'pending')
          .in('role_id', clientRoles.map(r => r.id))
        pendingReviewCount = count ?? 0
      }
    }
  }

  console.log('[Dashboard] userRole:', userRole, '| pendingReviewCount:', pendingReviewCount, '| profile:', profile?.full_name ?? 'NO PROFILE FOUND')

  const stats = [
    { label: 'Active Clients', value: clientCount ?? 0, href: '/dashboard/clients' },
    { label: 'Open Roles', value: openRoleCount ?? 0, href: '/dashboard/roles' },
    { label: 'Candidates', value: candidateCount ?? 0, href: '/dashboard/candidates' },
    ...(userRole !== '' && userRole !== 'director'
      ? [{ label: 'Pending My Review', value: pendingReviewCount, href: '/dashboard/internal-reviews' }]
      : userRole === 'director'
      ? [{ label: 'Pending TM Reviews', value: pendingReviewCount, href: '/dashboard/internal-reviews' }]
      : []),
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {profile?.role ? roleLabel[profile.role] : 'No role assigned'} · Level Up Operating System
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <a
            key={stat.label}
            href={stat.href}
            className={`bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow ${
              stat.label === 'Pending My Review' && stat.value > 0
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200'
            }`}
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-semibold mt-1 ${
              stat.label === 'Pending My Review' && stat.value > 0 ? 'text-yellow-700' : 'text-gray-900'
            }`}>
              {stat.value}
            </p>
          </a>
        ))}
      </div>

      {!profile && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 text-sm text-yellow-800">
          <strong>Setup required:</strong> Your user account does not have a profile row in the database.
          Ask a Director or Talent Manager to create your profile, or run the setup SQL in Supabase.
        </div>
      )}
    </div>
  )
}
