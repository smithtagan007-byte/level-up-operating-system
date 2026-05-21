'use client'

import { useTransition } from 'react'
import { dismissActionItemAction } from './actions'

export function DismissActionItemButton({ actionItemId }: { actionItemId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => dismissActionItemAction(actionItemId))}
      disabled={isPending}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 shrink-0"
    >
      {isPending ? '…' : 'Dismiss'}
    </button>
  )
}
