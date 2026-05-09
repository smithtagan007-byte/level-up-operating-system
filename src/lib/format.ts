export function formatZAR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'R 0'
  return 'R ' + amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
