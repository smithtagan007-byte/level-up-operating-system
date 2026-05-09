'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitForReviewAction } from '@/app/dashboard/internal-reviews/actions'

export function SubmitReviewButton({ candidateId }: { candidateId: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit() {
    setPending(true)
    setError(null)
    try {
      await submitForReviewAction(candidateId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Submitting…' : 'Submit for Internal Review'}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
