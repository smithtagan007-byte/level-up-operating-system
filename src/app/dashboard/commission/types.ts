export interface Placement {
  id: string
  staff_name: string | null
  recruiter_id: string | null
  client_invoice_date: string | null
  client: string
  candidate_name: string
  role_name: string
  start_date: string | null
  annual_ctc: number | null
  placement_fee_percentage: number | null
  placement_fee: number | null
  invoice_number: string | null
  client_paid: boolean
  commission_percentage: number | null
  commission_earned: number | null
  commission_month: string | null
  payroll_month: string | null
  commission_paid: number | null
  ts_earned: number | null
  payroll_commission: number | null
  payroll_advance: number | null
  advance_paid: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Recruiter {
  id: string
  full_name: string
}
