import { createClient } from '@/lib/supabase/server'
import { ReviewForm } from './ReviewForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReviewData } from './actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidate }, { data: review }] = await Promise.all([
    supabase.from('candidates').select('id, full_name').eq('id', id).single(),
    supabase.from('candidate_reviews').select('*').eq('candidate_id', id).maybeSingle(),
  ])

  if (!candidate) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/dashboard/candidates/${id}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← {candidate.full_name}
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-3">Review Scorecard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Score each criterion 1–10, select a tier, and complete all notes.</p>
      </div>

      <ReviewForm
        candidateId={id}
        candidateName={candidate.full_name}
        existing={review ? review as unknown as Partial<ReviewData> : undefined}
      />
    </div>
  )
}
