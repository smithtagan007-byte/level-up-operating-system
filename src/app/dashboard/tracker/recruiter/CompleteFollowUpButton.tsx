'use client'

import { useTransition } from 'react'
import { markFollowUpCompleteAction } from '@/app/dashboard/tracker/follow-ups/actions'

interface Props {
  followUpId: string
}

export function CompleteFollowUpButton({ followUpId }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markFollowUpCompleteAction(followUpId)
        })
      }
      className="text-xs text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-40 whitespace-nowrap"
    >
      {isPending ? '…' : 'Done'}
    </button>
  )
}
