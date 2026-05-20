'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/lib/icons'
import type { Client } from '@/lib/data'

export function NewEstimateSheet({
  clients,
  companyId,
  onClose,
  onCreated,
}: {
  clients: Client[]
  companyId: string | null
  onClose: () => void
  onCreated: (id: string, clientId: string, clientName: string, job: string) => void
}) {
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? '')
  const [job, setJob] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (!companyId) {
      setError('Not signed in.')
      return
    }
    if (!clientId) {
      setError('Pick a client.')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('estimates')
      .insert({
        company_id: companyId,
        client_id: clientId,
        job_description: job.trim(),
        status: 'draft',
      })
      .select('id, clients(name)')
      .single()
    setSubmitting(false)
    if (error || !data) {
      setError(error?.message ?? 'Could not create estimate.')
      return
    }
    const clientName =
      (Array.isArray(data.clients) ? data.clients[0]?.name : (data.clients as { name?: string } | null)?.name) ??
      clients.find((c) => c.id === clientId)?.name ??
      ''
    onCreated(data.id, clientId, clientName, job.trim())
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '88%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>New Estimate</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--cream-200)',
                fontSize: 15,
                background: '#fff',
                fontFamily: 'inherit',
              }}
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Job Description</label>
            <textarea
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="e.g. Spring Mulch Install — Front Beds"
              rows={3}
            />
          </div>
          {error && (
            <div className="banner err">
              <div>{error}</div>
            </div>
          )}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            onClick={submit}
            disabled={submitting || !clientId}
          >
            <Icon.check width="16" height="16" /> {submitting ? 'Creating…' : 'Create estimate'}
          </button>
        </div>
      </div>
    </>
  )
}
