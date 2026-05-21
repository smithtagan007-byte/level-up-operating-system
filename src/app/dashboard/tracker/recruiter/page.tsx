import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ userId?: string }>
}

export default async function RecruiterDashboardRedirect({ searchParams }: Props) {
  const params = await searchParams
  const qs = params.userId ? `?userId=${params.userId}` : ''
  redirect(`/dashboard${qs}`)
}
