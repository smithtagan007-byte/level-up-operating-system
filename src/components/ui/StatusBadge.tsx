interface StatusBadgeProps {
  status: string
}

const statusStyles: Record<string, string> = {
  // Setup
  intake: 'bg-yellow-100 text-yellow-800',
  // Active pipeline
  sourcing: 'bg-blue-100 text-blue-800',
  screening: 'bg-purple-100 text-purple-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  submitted: 'bg-sky-100 text-sky-800',
  interviewing: 'bg-orange-100 text-orange-800',
  offer: 'bg-teal-100 text-teal-800',
  // Terminal
  placed: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<string, string> = {
  intake: 'Intake',
  sourcing: 'Sourcing',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  submitted: 'Submitted',
  interviewing: 'Interviewing',
  offer: 'Offer',
  placed: 'Placed',
  closed: 'Closed',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {statusLabels[status] ?? status}
    </span>
  )
}
