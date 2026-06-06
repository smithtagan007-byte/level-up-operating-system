import Link from 'next/link'
import { AlertCircle, CheckCircle2, Clock, ArrowRight, Users, Send, Calendar } from 'lucide-react'

interface Props {
  roleId: string
  status: string
  intakeCompleted: boolean
  candidateCount: number
  approvedNotSubmitted: number
  submittedToClient: number
  interviewsScheduled: number
}

export function RoleGuidanceBanner({
  roleId,
  status,
  intakeCompleted,
  candidateCount,
  approvedNotSubmitted,
  submittedToClient,
  interviewsScheduled,
}: Props) {
  // Terminal states — no guidance needed
  if (status === 'placed') {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
        <p className="text-sm font-medium text-emerald-800">Role filled — placement confirmed</p>
      </div>
    )
  }
  if (status === 'closed') return null

  // INTAKE BLOCKED
  if (status === 'intake' && !intakeCompleted) {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Intake form incomplete</p>
            <p className="text-xs text-red-600 mt-0.5">This role cannot move to Sourcing until intake is done.</p>
          </div>
        </div>
        <Link
          href={`/dashboard/roles/${roleId}/intake`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Complete Intake <ArrowRight size={12} />
        </Link>
      </div>
    )
  }

  // INTAKE DONE — READY TO PROGRESS
  if (status === 'intake' && intakeCompleted) {
    return (
      <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Intake complete — ready to start sourcing</p>
            <p className="text-xs text-blue-600 mt-0.5">Move this role to Sourcing to open up the candidate pipeline.</p>
          </div>
        </div>
      </div>
    )
  }

  // SOURCING — NO CANDIDATES YET
  if (status === 'sourcing' && candidateCount === 0) {
    return (
      <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <Users size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No candidates in pipeline yet</p>
            <p className="text-xs text-amber-600 mt-0.5">Add candidates from the Candidates section to start building your shortlist.</p>
          </div>
        </div>
      </div>
    )
  }

  // CANDIDATES APPROVED — READY TO SUBMIT
  if (approvedNotSubmitted > 0) {
    return (
      <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <Send size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              {approvedNotSubmitted} candidate{approvedNotSubmitted !== 1 ? 's' : ''} approved and ready to submit
            </p>
            <p className="text-xs text-blue-600 mt-0.5">These have passed internal review — submit to the client below.</p>
          </div>
        </div>
      </div>
    )
  }

  // SUBMITTED — AWAITING CLIENT FEEDBACK
  if (status === 'submitted' && submittedToClient > 0) {
    return (
      <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
        <Clock size={18} className="text-sky-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-sky-800">
            {submittedToClient} candidate{submittedToClient !== 1 ? 's' : ''} submitted — awaiting client feedback
          </p>
          <p className="text-xs text-sky-600 mt-0.5">Chase feedback if no response within 3 business days.</p>
        </div>
      </div>
    )
  }

  // INTERVIEWING
  if (status === 'interviewing') {
    return (
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
        <Calendar size={18} className="text-orange-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-orange-800">
            Interviews in progress
            {interviewsScheduled > 0 ? ` — ${interviewsScheduled} scheduled` : ''}
          </p>
          <p className="text-xs text-orange-600 mt-0.5">Log outcomes after each interview to keep the pipeline current.</p>
        </div>
      </div>
    )
  }

  // OFFER STAGE
  if (status === 'offer') {
    return (
      <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
        <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-teal-800">Offer stage — close is near</p>
          <p className="text-xs text-teal-600 mt-0.5">Keep communication lines open. Log the offer outcome when confirmed.</p>
        </div>
      </div>
    )
  }

  // DEFAULT — role has candidates and is progressing
  if (candidateCount > 0) {
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <CheckCircle2 size={18} className="text-gray-400 shrink-0" />
        <p className="text-sm text-gray-600">
          {candidateCount} candidate{candidateCount !== 1 ? 's' : ''} in pipeline — keep moving them forward
        </p>
      </div>
    )
  }

  return null
}
