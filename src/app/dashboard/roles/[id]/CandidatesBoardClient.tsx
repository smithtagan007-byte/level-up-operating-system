'use client'

import { useState, useEffect } from 'react'
import type { BoardCandidate } from './CandidatesBoardView'

interface Props {
  candidates: BoardCandidate[]
  roleId: string
}

export function CandidatesBoardClient({ candidates, roleId }: Props) {
  const [View, setView] = useState<React.ComponentType<Props> | null>(null)

  useEffect(() => {
    // Only import @hello-pangea/dnd after mount — it requires browser context
    import('./CandidatesBoardView').then(m => setView(() => m.CandidatesBoardView))
  }, [])

  if (!View) {
    // Skeleton: show columns while loading
    return (
      <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: '55vh' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="shrink-0 w-56">
            <div className="h-4 w-20 bg-gray-100 rounded mb-3 animate-pulse" />
            <div className="bg-gray-50 rounded-xl h-24 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return <View candidates={candidates} roleId={roleId} />
}
