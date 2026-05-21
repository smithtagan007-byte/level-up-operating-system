export type UserRole = 'director' | 'talent_manager' | 'talent_specialist'

export type CandidateTier = 'A' | 'B' | 'C' | 'D' | 'Reject'

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  name: string
  industry: string | null
  grade: string | null
  owner_id: string
  created_at: string
}

export interface Role {
  id: string
  title: string
  client_id: string
  status: 'intake' | 'sourcing' | 'screening' | 'interviewing' | 'closed'
  intake_completed: boolean
  created_at: string
}

export interface Candidate {
  id: string
  full_name: string
  email: string | null
  role_id: string
  tier: CandidateTier | null
  risk_level: RiskLevel | null
  client_owner_approved: boolean
  talent_manager_approved: boolean
  submitted_to_client: boolean
  current_company: string | null
  current_title: string | null
  created_at: string
}
