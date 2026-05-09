export const CATEGORIES = [
  'Role Intelligence',
  'Candidate Assessment',
  'Screening',
  'Client Management',
  'Interview',
  'Offer Management',
  'Candidate Management',
  'Business Development',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_STYLES: Record<string, string> = {
  'Role Intelligence': 'bg-blue-100 text-blue-700',
  'Candidate Assessment': 'bg-purple-100 text-purple-700',
  'Screening': 'bg-orange-100 text-orange-700',
  'Client Management': 'bg-green-100 text-green-700',
  'Interview': 'bg-teal-100 text-teal-700',
  'Offer Management': 'bg-red-100 text-red-700',
  'Candidate Management': 'bg-yellow-100 text-yellow-800',
  'Business Development': 'bg-indigo-100 text-indigo-700',
}
