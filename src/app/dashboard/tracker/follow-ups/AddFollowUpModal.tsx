'use client'

import { useState, useRef } from 'react'
import { createFollowUpAction } from './actions'

const FOLLOW_UP_TYPES = [
  'Client Call', 'Candidate Check-in', 'Role Update',
  'Interview Follow-up', 'Offer Follow-up', 'Reference Check', 'Other',
]

interface Entity { id: string; label: string }

interface Props {
  currentUserId: string
  users: { id: string; full_name: string }[]
  clients: Entity[]
  candidates: Entity[]
  roles: Entity[]
}

export function AddFollowUpModal({ currentUserId, users, clients, candidates, roles }: Props) {
  const [open, setOpen] = useState(false)
  const [relatedType, setRelatedType] = useState<'client' | 'candidate' | 'role'>('client')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const entities = relatedType === 'client' ? clients : relatedType === 'candidate' ? candidates : roles

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createFollowUpAction(new FormData(e.currentTarget))
      formRef.current?.reset()
      setRelatedType('client')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors">
        + Add Follow-Up
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">New Follow-Up</h2>
              <button onClick={() => { setOpen(false); setError(null) }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                <select name="follow_up_type" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="">Select type</option>
                  {FOLLOW_UP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related To <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  {(['client', 'candidate', 'role'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setRelatedType(t)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors capitalize ${relatedType === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="related_type" value={relatedType} />
                <select name="related_id" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="">Select {relatedType}</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input name="follow_up_reason" placeholder="Brief reason for this follow-up" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                <input type="date" name="due_date" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner <span className="text-red-500">*</span></label>
                <select name="owner_id" required defaultValue={currentUserId} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">Cancel</button>
                <button type="submit" disabled={pending} className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {pending ? 'Saving…' : 'Add Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
