'use client'

import { useState, useEffect } from 'react'
import type { BoardRole } from './RolesBoardView'

export function RolesBoardClient({ roles }: { roles: BoardRole[] }) {
  const [View, setView] = useState<React.ComponentType<{ roles: BoardRole[] }> | null>(null)

  useEffect(() => {
    // Only import @hello-pangea/dnd after mount — it requires browser context
    import('./RolesBoardView').then(m => setView(() => m.RolesBoardView))
  }, [])

  if (!View) {
    // Skeleton: show columns while loading
    return (
      <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: '55vh' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="shrink-0 w-56">
            <div className="h-4 w-20 bg-gray-100 rounded mb-3 animate-pulse" />
            <div className="bg-gray-50 rounded-xl h-32 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return <View roles={roles} />
}
