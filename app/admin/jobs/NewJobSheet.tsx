'use client'

import { useState } from 'react'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/lib/data'
import { NumberInput } from '@/components/NumberInput'
import type { WorkerOption } from './page.client'

export type NewJobInput = {
  clientId: string
  kind: 'onetime' | 'recurring'
  service: string
  price: number
  scheduledDate?: string
  frequency?: string
  nextDate?: string
  notes?: string
  workerIds: string[]
  estimateId?: string
}

export type NewJobResult = { jobId: string; kind: 'onetime' | 'recurring' }

export function NewJobSheet({
  clients,
  workers,
  companyId,
  onClose,
  onCreated,
  prefill,
}: {
  clients: Client[]
  workers: WorkerOption[]
  companyId: string | null
  onClose: () => void
  onCreated: (result: NewJobResult) => void
  prefill?: {
    clientId?: string
    service?: string
    price?: number
    estimateId?: string
  }
}) {
  const [clientId, setClientId] = useState(prefill?.clientId ?? clients[0]?.id ?? '')
  const [kind, setKind] = useState<'onetime' | 'recurring'>('onetime')
  const [service, setService] = useState(prefill?.service ?? '')
  const [price, setPrice] = useState<number>(prefill?.price ?? 0)
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [frequency, setFrequency] = useState('')
  const [nextDate, setNextDate] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = useState('')
  const [workerIds, setWorkerIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleWorker(id: string) {
    setWorkerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function submit() {
    setError(null)
    if (!companyId) return setError('Not signed in.')
    if (!clientId) return setError('Pick a client.')
    if (!service.trim()) return setError('Enter the project / service.')

    setSubmitting(true)
    const supabase = createClient()

    const payload: Record<string, unknown> = {
      company_id: companyId,
      client_id: clientId,
      kind,
      service: service.trim(),
      price_cents: Math.round(price * 100),
      notes: notes.trim() || null,
      estimate_id: prefill?.estimateId ?? null,
    }
    if (kind === 'onetime') {
      payload.scheduled_date = scheduledDate || null
      payload.status = 'scheduled'
    } else {
      payload.frequency = frequency.trim() || null
      payload.next_date = nextDate || null
      payload.status = 'scheduled'
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert(payload)
      .select('id')
      .single()

    if (jobErr || !job) {
      setSubmitting(false)
      setError(jobErr?.message ?? 'Failed to create job.')
      return
    }

    if (workerIds.length > 0) {
      const rows = workerIds.map((wid) => ({ job_id: job.id, worker_id: wid }))
      const { error: jwErr } = await supabase.from('job_workers').insert(rows)
      if (jwErr) {
        // Job was created; surface a soft warning but treat as success.
        setError(`Job created, but assigning workers failed: ${jwErr.message}`)
      }
    }

    setSubmitting(false)
    onCreated({ jobId: job.id, kind })
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '92%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>New Job</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={selectStyle}>
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Type</label>
            <div className="segment" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={kind === 'onetime' ? 'on' : ''}
                onClick={() => setKind('onetime')}
              >
                One-time
              </button>
              <button
                type="button"
                className={kind === 'recurring' ? 'on' : ''}
                onClick={() => setKind('recurring')}
              >
                Recurring
              </button>
            </div>
          </div>

          <div className="field">
            <label>Project / Service</label>
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder={kind === 'onetime' ? 'e.g. Spring Mulch Install' : 'e.g. Weekly Lawn Cut'}
            />
          </div>

          <div className="field">
            <label>Price ({kind === 'recurring' ? 'per visit' : 'total'})</label>
            <NumberInput
              value={price}
              onChange={setPrice}
              placeholder="0"
              style={inputStyle}
            />
          </div>

          {kind === 'onetime' ? (
            <div className="field">
              <label>Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Frequency</label>
                <input
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="e.g. Weekly · Tuesdays"
                />
              </div>
              <div className="field">
                <label>Next Visit</label>
                <input
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div className="field">
            <label>Crew</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {workers.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--stone-500)' }}>
                  No workers yet. Add them from the Team page.
                </div>
              )}
              {workers.map((w) => {
                const on = workerIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWorker(w.id)}
                    style={chipStyle(on, w.role)}
                  >
                    {on && <Icon.check width="14" height="14" w={2.4} />}
                    <span>{w.name}</span>
                    <span style={{ fontSize: 10.5, opacity: 0.7, marginLeft: 4 }}>
                      {w.role === 'owner' ? 'owner' : 'worker'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {kind === 'onetime' && (
            <div className="field">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Access info, parking, special instructions…"
                rows={3}
              />
            </div>
          )}

          {error && (
            <div className="banner err" style={{ marginTop: 4 }}>
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
            disabled={submitting || !clientId || !service.trim()}
          >
            <Icon.check width="16" height="16" /> {submitting ? 'Creating…' : 'Create job'}
          </button>
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--cream-200)',
  background: '#fff',
  fontSize: 15,
  fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

function chipStyle(on: boolean, role: 'owner' | 'worker'): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid ' + (on ? 'var(--forest-700)' : 'var(--cream-200)'),
    background: on ? 'var(--forest-700)' : '#fff',
    color: on ? '#fff' : role === 'owner' ? 'var(--forest-800)' : 'var(--ink-900)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
