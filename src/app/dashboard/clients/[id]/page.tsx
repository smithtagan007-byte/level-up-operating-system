import { createClient } from '@/lib/supabase/server'
import { ClientGradeBadge } from '@/components/ui/ClientGradeBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AssignOwnerSelect } from './AssignOwnerSelect'
import { ClientProfileSection } from './ClientProfileSection'
import { ClientContactsSection } from './ClientContactsSection'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ClientProfileData } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: roles }, { data: clientOwners }, { data: contacts }] = await Promise.all([
    supabase
      .from('clients')
      .select(`
        id, name, industry, grade, owner_id,
        website, linkedin_url, location, headcount,
        relationship_health, relationship_notes, culture_notes, hiring_preferences,
        fee_percentage, payment_terms_days, warranty_period_days,
        user_profiles(id, full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('roles')
      .select('id, title, status, intake_completed')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('id, full_name')
      .order('full_name'),
    supabase
      .from('client_contacts')
      .select('id, name, title, email, phone, is_primary, notes')
      .eq('client_id', id)
      .order('is_primary', { ascending: false })
      .order('name'),
  ])

  if (!client) notFound()

  const owner = (Array.isArray(client.user_profiles) ? client.user_profiles[0] : client.user_profiles) as { id: string; full_name: string } | null

  const profileData: ClientProfileData = {
    industry: client.industry,
    website: (client as Record<string, unknown>).website as string | null ?? null,
    linkedin_url: (client as Record<string, unknown>).linkedin_url as string | null ?? null,
    location: (client as Record<string, unknown>).location as string | null ?? null,
    headcount: (client as Record<string, unknown>).headcount as number | null ?? null,
    relationship_health: (client as Record<string, unknown>).relationship_health as string | null ?? null,
    relationship_notes: (client as Record<string, unknown>).relationship_notes as string | null ?? null,
    culture_notes: (client as Record<string, unknown>).culture_notes as string | null ?? null,
    hiring_preferences: (client as Record<string, unknown>).hiring_preferences as string | null ?? null,
    fee_percentage: (client as Record<string, unknown>).fee_percentage as number | null ?? null,
    payment_terms_days: (client as Record<string, unknown>).payment_terms_days as number | null ?? null,
    warranty_period_days: (client as Record<string, unknown>).warranty_period_days as number | null ?? null,
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/clients" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Clients
        </Link>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {client.industry ?? 'No industry set'}
              {(profileData.location) ? ` · ${profileData.location}` : ''}
            </p>
          </div>
          <ClientGradeBadge grade={client.grade} />
        </div>
      </div>

      {/* Client Owner */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Client Owner</dt>
            <dd>
              <AssignOwnerSelect
                clientId={client.id}
                currentOwnerId={client.owner_id}
                currentOwnerName={owner?.full_name ?? null}
                clientOwners={clientOwners ?? []}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Grade</dt>
            <dd><ClientGradeBadge grade={client.grade} /></dd>
          </div>
        </dl>
      </div>

      {/* Client Profile */}
      <ClientProfileSection clientId={client.id} initial={profileData} />

      {/* Key Contacts */}
      <ClientContactsSection
        clientId={client.id}
        initialContacts={contacts ?? []}
      />

      {/* Roles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Roles</h2>
          <Link
            href={`/dashboard/roles?client=${client.id}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            + Add Role
          </Link>
        </div>

        {!roles?.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">No roles for this client yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto table-container">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intake</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{role.title}</td>
                    <td className="px-5 py-4"><StatusBadge status={role.status} /></td>
                    <td className="px-5 py-4">
                      {role.intake_completed
                        ? <span className="text-emerald-600 text-xs font-medium">Complete</span>
                        : <span className="text-yellow-600 text-xs font-medium">Pending</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/dashboard/roles/${role.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
