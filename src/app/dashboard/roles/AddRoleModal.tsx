'use client'

import { useState, useRef } from 'react'
import { createRoleAction } from './actions'

interface Client {
  id: string
  name: string
}

interface AddRoleModalProps {
  clients: Client[]
  preselectedClientId?: string
}

export function AddRoleModal({ clients, preselectedClientId }: AddRoleModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await createRoleAction(new FormData(e.currentTarget))
      formRef.current?.reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        + Add Role
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Role</h2>
              <button
                onClick={() => { setOpen(false); setError(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Senior Account Manager"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  name="client_id"
                  required
                  defaultValue={preselectedClientId ?? ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                New roles start in <strong>Intake</strong>. Intake must be completed before the role can move to Sourcing.
              </p>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setError(null) }}
                  className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Saving…' : 'Add Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
