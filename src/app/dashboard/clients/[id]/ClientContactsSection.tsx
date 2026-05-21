'use client'

import { useState } from 'react'
import {
  addClientContactAction,
  updateClientContactAction,
  deleteClientContactAction,
  type ContactData,
} from '../actions'

interface Contact {
  id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  notes: string | null
}

interface ClientContactsSectionProps {
  clientId: string
  initialContacts: Contact[]
}

const emptyForm: ContactData = { name: '', title: null, email: null, phone: null, is_primary: false, notes: null }

function ContactForm({
  initial,
  onSave,
  onCancel,
  pending,
  error,
}: {
  initial: ContactData
  onSave: (data: ContactData) => void
  onCancel: () => void
  pending: boolean
  error: string | null
}) {
  const [form, setForm] = useState<ContactData>(initial)

  function set<K extends keyof ContactData>(key: K, val: ContactData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Full name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title / Role</label>
          <input
            type="text"
            value={form.title ?? ''}
            onChange={e => set('title', e.target.value || null)}
            placeholder="e.g. Head of Talent"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={e => set('email', e.target.value || null)}
            placeholder="name@company.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input
            type="text"
            value={form.phone ?? ''}
            onChange={e => set('phone', e.target.value || null)}
            placeholder="+27 82 000 0000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value || null)}
            rows={2}
            placeholder="Anything useful to know about this contact…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white resize-none"
          />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_primary ?? false}
              onChange={e => set('is_primary', e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Primary contact
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={pending || !form.name.trim()}
          className="bg-gray-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save Contact'}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function ClientContactsSection({ clientId, initialContacts }: ClientContactsSectionProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd(data: ContactData) {
    if (!data.name.trim()) return
    setPending(true)
    setError(null)
    try {
      await addClientContactAction(clientId, data)
      // Optimistically add — page will revalidate on next load
      setContacts(prev => [...prev, {
        id: crypto.randomUUID(),
        name: data.name,
        title: data.title ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        is_primary: data.is_primary ?? false,
        notes: data.notes ?? null,
      }])
      setAddingNew(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  async function handleUpdate(contactId: string, data: ContactData) {
    if (!data.name.trim()) return
    setPending(true)
    setError(null)
    try {
      await updateClientContactAction(contactId, clientId, data)
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...data } as Contact : c))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(contactId: string) {
    setDeletingId(contactId)
    setError(null)
    try {
      await deleteClientContactAction(contactId, clientId)
      setContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Key Contacts</h2>
        {!addingNew && (
          <button
            onClick={() => { setAddingNew(true); setEditingId(null) }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            + Add Contact
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {/* Existing contacts */}
        {contacts.length === 0 && !addingNew && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400">No contacts added yet.</p>
            <button
              onClick={() => setAddingNew(true)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
            >
              Add first contact →
            </button>
          </div>
        )}

        {contacts.map(contact => (
          <div key={contact.id} className="px-5 py-4">
            {editingId === contact.id ? (
              <ContactForm
                initial={{ name: contact.name, title: contact.title, email: contact.email, phone: contact.phone, is_primary: contact.is_primary, notes: contact.notes }}
                onSave={(data) => handleUpdate(contact.id, data)}
                onCancel={() => { setEditingId(null); setError(null) }}
                pending={pending}
                error={error}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                    {contact.is_primary && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                        Primary
                      </span>
                    )}
                  </div>
                  {contact.title && <p className="text-xs text-gray-500 mt-0.5">{contact.title}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-gray-600">
                        {contact.phone}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">{contact.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => { setEditingId(contact.id); setAddingNew(false); setError(null) }}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    disabled={deletingId === contact.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === contact.id ? '…' : 'Remove'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new contact form */}
        {addingNew && (
          <div className="px-5 py-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Contact</p>
            <ContactForm
              initial={emptyForm}
              onSave={handleAdd}
              onCancel={() => { setAddingNew(false); setError(null) }}
              pending={pending}
              error={error}
            />
          </div>
        )}
      </div>
    </div>
  )
}
