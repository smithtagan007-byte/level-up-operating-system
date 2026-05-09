interface ClientGradeBadgeProps {
  grade: string | null
}

const gradeStyles: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-red-100 text-red-800',
}

export function ClientGradeBadge({ grade }: ClientGradeBadgeProps) {
  if (!grade) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${gradeStyles[grade] ?? 'bg-gray-100 text-gray-600'}`}>
      Grade {grade}
    </span>
  )
}
