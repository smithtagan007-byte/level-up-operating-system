interface StatusBadgeProps {
  status: string
}

const statusStyles: Record<string, string> = {
  intake: 'bg-yellow-100 text-yellow-800',
  sourcing: 'bg-blue-100 text-blue-800',
  screening: 'bg-purple-100 text-purple-800',
  interviewing: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-gray-100 text-gray-600',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
