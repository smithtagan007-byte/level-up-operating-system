'use client'

import { useRouter } from 'next/navigation'

interface Props {
  users: { id: string; full_name: string }[]
  selectedId: string
}

export function UserSelector({ users, selectedId }: Props) {
  const router = useRouter()
  return (
    <select
      value={selectedId}
      onChange={e => router.push(`/dashboard/tracker/recruiter?userId=${e.target.value}`)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
    >
      {users.map(u => (
        <option key={u.id} value={u.id}>{u.full_name}</option>
      ))}
    </select>
  )
}
