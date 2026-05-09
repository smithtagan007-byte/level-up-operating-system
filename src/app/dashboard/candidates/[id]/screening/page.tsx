import { createClient } from '@/lib/supabase/server'
import { ScreeningForm } from './ScreeningForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ScreeningData } from './actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ScreeningPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: candidate }, { data: screening }] = await Promise.all([
    supabase.from('candidates').select('id, full_name').eq('id', id).single(),
    supabase.from('candidate_screenings').select('*').eq('candidate_id', id).maybeSingle(),
  ])

  if (!candidate) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/dashboard/candidates/${id}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← {candidate.full_name}
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-3">Screening Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">All fields required. Be specific — this form is used at offer stage.</p>
      </div>

      <ScreeningForm
        candidateId={id}
        existing={screening ? screening as unknown as Partial<ScreeningData> : undefined}
      />
    </div>
  )
}
