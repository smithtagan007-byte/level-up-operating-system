'use client'

import { useState, useTransition } from 'react'
import { assignTeamMemberAction, removeTeamMemberAction } from './role-team-actions'

export interface TeamMember {
  user_id: string
  role_on_role: 'client_owner' | 'delivery_specialist'
  full_name: string
}

interface Props {
  roleId: string
  team: TeamMember[]
  users: { id: string; full_name: string }[]
  isManager: boolean
  defaultOpen?: boolean
}

export function TeamSection({ roleId, team: initialTeam, users, isManager, defaultOpen = false }: Props) {
  const [team, setTeam] = useState<TeamMember[]>(initialTeam)
  const [showModal, setShowModal] = useState(defaultOpen)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'client_owner' | 'delivery_specialist'>('delivery_specialist')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  const clientOwner = team.find(m => m.role_on_role === 'client_owner')
  const specialists = team.filter(m => m.role_on_role === 'delivery_specialist')

  const existingClientOwner = team.find(m => m.role_on_role === 'client_owner')
  const wouldReplaceOwner = selectedRole === 'client_owner' && !!existingClientOwner && existingClientOwner.user_id !== selectedUser

  function handleAssign() {
    if (!selectedUser) { setError('Select a team member.'); return }
    setError(null)
    startTransition(async () => {
      try {
        await assignTeamMemberAction(roleId, selectedUser, selectedRole)
        const user = users.find(u => u.id === selectedUser)!
        setTeam(prev => {
          let next = prev.filter(m => !(m.role_on_role === 'client_owner' && selectedRole === 'client_owner' && m.user_id !== selectedUser))
          const existing = next.find(m => m.user_id === selectedUser && m.role_on_role === selectedRole)
          if (!existing) next = [...next, { user_id: selectedUser, role_on_role: selectedRole, full_name: user.full_name }]
          return next
        })
        setShowModal(false)
        setSelectedUser('')
        setSelectedRole('delivery_specialist')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign team member.')
      }
    })
  }

  function handleRemove(userId: string, roleOnRole: string) {
    const key = `${userId}:${roleOnRole}`
    setRemovingKey(key)
    startTransition(async () => {
      try {
        await removeTeamMemberAction(roleId, userId, roleOnRole)
        setTeam(prev => prev.filter(m => !(m.user_id === userId && m.role_on_role === roleOnRole)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove team member.')
      } finally {
        setRemovingKey(null)
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Team</h2>
        {isManager && (
          <button
            onClick={() => { setShowModal(true); setError(null) }}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 transition-colors"
          >
            + Assign Team Member
          </button>
        )}
      </div>

      {team.length === 0 ? (
        <div className="flex items-center gap-2 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <p className="text-sm text-amber-700">No team assigned to this role.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Client Owner */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Client Owner</p>
            {clientOwner ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {clientOwner.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{clientOwner.full_name}</span>
                </div>
                {isManager && (
                  <button
                    onClick={() => handleRemove(clientOwner.user_id, 'client_owner')}
                    disabled={removingKey === `${clientOwner.user_id}:client_owner`}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not assigned</p>
            )}
          </div>

          {/* Delivery Specialists */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Delivery Specialists{specialists.length > 0 ? ` (${specialists.length})` : ''}
            </p>
            {specialists.length === 0 ? (
              <p className="text-sm text-gray-400 italic">None assigned</p>
            ) : (
              <div className="space-y-2">
                {specialists.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{m.full_name}</span>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => handleRemove(m.user_id, 'delivery_specialist')}
                        disabled={removingKey === `${m.user_id}:delivery_specialist`}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Assign Team Member</h3>
              <button
                onClick={() => { setShowModal(false); setError(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Select person</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role on this Role</label>
                <div className="flex gap-2">
                  {(['delivery_specialist', 'client_owner'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-colors ${
                        selectedRole === r
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {r === 'client_owner' ? 'Client Owner' : 'Delivery Specialist'}
                    </button>
                  ))}
                </div>
              </div>

              {wouldReplaceOwner && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800">
                    This will replace <strong>{existingClientOwner?.full_name}</strong> as Client Owner.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null) }}
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
                >
                  {defaultOpen && team.length === 0 ? 'Skip' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={isPending || !selectedUser}
                  className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
