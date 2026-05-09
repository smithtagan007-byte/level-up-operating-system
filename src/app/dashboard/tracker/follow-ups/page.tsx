import { createClient } from '@/lib/supabase/server'
import { FollowUpsClient } from './FollowUpsClient'
import { AddFollowUpModal } from './AddFollowUpModal'

export default async function FollowUpsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: rawFollowUps },
    { data: users },
    { data: clients },
    { data: candidates },
    { data: roles },
  ] = await Promise.all([
    supabase
      .from('follow_ups')
      .select('id, follow_up_type, follow_up_reason, related_type, related_id, due_date, status, notes, completed_at, user_profiles(full_name)')
      .order('due_date', { ascending: true }),
    supabase.from('user_profiles').select('id, full_name').order('full_name'),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('candidates').select('id, full_name').order('full_name'),
    supabase.from('roles').select('id, title').order('title'),
  ])

  // Build label maps for each entity type
  const clientMap = Object.fromEntries((clients ?? []).map(c => [c.id, c.name]))
  const candidateMap = Object.fromEntries((candidates ?? []).map(c => [c.id, c.full_name]))
  const roleMap = Object.fromEntries((roles ?? []).map(r => [r.id, r.title]))

  const followUps = (rawFollowUps ?? []).map(fu => {
    const ownerRaw = Array.isArray(fu.user_profiles) ? fu.user_profiles[0] : fu.user_profiles
    const labelMap = fu.related_type === 'client' ? clientMap : fu.related_type === 'candidate' ? candidateMap : roleMap
    return {
      id: fu.id,
      follow_up_type: fu.follow_up_type,
      follow_up_reason: fu.follow_up_reason,
      related_type: fu.related_type,
      related_label: labelMap[fu.related_id] ?? fu.related_id,
      owner_name: (ownerRaw as { full_name: string } | null)?.full_name ?? '—',
      due_date: fu.due_date,
      status: fu.status,
      notes: fu.notes,
      completed_at: fu.completed_at,
    }
  })

  const clientEntities = (clients ?? []).map(c => ({ id: c.id, label: c.name }))
  const candidateEntities = (candidates ?? []).map(c => ({ id: c.id, label: c.full_name }))
  const roleEntities = (roles ?? []).map(r => ({ id: r.id, label: r.title }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Follow-Up Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">{followUps.length} total follow-up{followUps.length !== 1 ? 's' : ''}</p>
        </div>
        <AddFollowUpModal
          currentUserId={user!.id}
          users={users ?? []}
          clients={clientEntities}
          candidates={candidateEntities}
          roles={roleEntities}
        />
      </div>
      <FollowUpsClient followUps={followUps} owners={users ?? []} />
    </div>
  )
}
