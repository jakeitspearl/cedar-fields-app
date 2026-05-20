'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/lib/data'
import { NumberInput } from '@/components/NumberInput'
import { generateLinesFromEstimate } from './generate'
import type { EstimateRef, JobRef } from './page.client'

export type NewInvoiceResult = { invoiceId: string; openGenerateFromJob?: boolean; jobId?: string }

export function NewInvoiceSheet({
  clients,
  estimates,
  jobs,
  companyId,
  onClose,
  onCreated,
}: {
  clients: Client[]
  estimates: EstimateRef[]
  jobs: JobRef[]
  companyId: string | null
  onClose: () => void
  onCreated: (result: NewInvoiceResult) => void
}) {
  // Source: blank | estimate:<id> | job:<id>
  const [source, setSource] = useState<string>('')
  const sourceKind = source.startsWith('estimate:')
    ? 'estimate'
    : source.startsWith('job:')
      ? 'job'
      : 'blank'
  const sourceId = source.includes(':') ? source.split(':')[1] : ''

  const selectedEstimate = useMemo(
    () => (sourceKind === 'estimate' ? estimates.find((e) => e.id === sourceId) ?? null : null),
    [sourceKind, sourceId, estimates],
  )
  const selectedJob = useMemo(
    () => (sourceKind === 'job' ? jobs.find((j) => j.id === sourceId) ?? null : null),
    [sourceKind, sourceId, jobs],
  )

  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [jobReference, setJobReference] = useState('')
  const [total, setTotal] = useState<number>(0)
  const [dueLabel, setDueLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When estimate or job changes, prefill client + job ref.
  useEffect(() => {
    if (selectedEstimate) {
      setClientId(selectedEstimate.clientId)
      setJobReference(selectedEstimate.job)
    } else if (selectedJob) {
      setClientId(selectedJob.clientId)
      setJobReference(selectedJob.service)
    }
  }, [selectedEstimate, selectedJob])

  // Default due label: "Due {today + 14 days}".
  useEffect(() => {
    if (dueLabel) return
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDueLabel('Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    setError(null)
    if (!companyId) return setError('Not signed in.')
    if (!clientId) return setError('Pick a client.')
    if (!jobReference.trim()) return setError('Enter a job reference.')

    setSubmitting(true)
    const supabase = createClient()
    const { data, error: insErr } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        client_id: clientId,
        estimate_id: selectedEstimate?.id ?? null,
        job_id: selectedJob?.id ?? null,
        job_reference: jobReference.trim(),
        status: 'draft',
        total_cents: selectedEstimate || selectedJob ? 0 : Math.round(total * 100),
        due_label: dueLabel.trim() || null,
        apply_tax: false,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (insErr || !data) {
      setSubmitting(false)
      setError(insErr?.message ?? 'Failed to create invoice.')
      return
    }

    if (selectedEstimate) {
      const gen = await generateLinesFromEstimate(data.id, selectedEstimate.id)
      if (!gen.ok) {
        setSubmitting(false)
        setError(`Invoice created, but copying lines failed: ${gen.error}`)
        return
      }
      setSubmitting(false)
      onCreated({ invoiceId: data.id })
      return
    }

    if (selectedJob) {
      // Job flow needs the markup UI to pick receipts. Drop the user into that
      // sheet on the just-created invoice.
      setSubmitting(false)
      onCreated({ invoiceId: data.id, openGenerateFromJob: true, jobId: selectedJob.id })
      return
    }

    if (total > 0) {
      // No source — create a single custom line so the editor isn't blank.
      await supabase.from('invoice_line_items').insert({
        invoice_id: data.id,
        position: 0,
        name: jobReference.trim(),
        qty: 1,
        unit_price_cents: Math.round(total * 100),
        kind: 'custom',
      })
    }

    setSubmitting(false)
    onCreated({ invoiceId: data.id })
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '92%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>New Invoice</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Blank invoice —</option>
              {estimates.length > 0 && (
                <optgroup label="From Estimate">
                  {estimates.map((e) => (
                    <option key={e.id} value={'estimate:' + e.id}>
                      {e.clientName} — {e.job} ({e.status})
                    </option>
                  ))}
                </optgroup>
              )}
              {jobs.length > 0 && (
                <optgroup label="From Completed Job">
                  {jobs.map((j) => (
                    <option key={j.id} value={'job:' + j.id}>
                      {j.clientName} — {j.service}
                      {j.scheduledDate ? ` (${j.scheduledDate})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedEstimate && (
              <div style={sourceHintStyle}>
                <Icon.check width="13" height="13" /> Labor, materials (priced), and disposal will copy from
                this estimate as editable line items. TBD-priced materials are skipped.
              </div>
            )}
            {selectedJob && (
              <div style={sourceHintStyle}>
                <Icon.check width="13" height="13" /> Next step will let you pick receipts (costs), set a
                markup, and confirm hours before line items are created.
              </div>
            )}
          </div>

          <div className="field">
            <label>
              Client
              {(selectedEstimate || selectedJob) && (
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--stone-500)', fontWeight: 500 }}>
                  (from {selectedJob ? 'job' : 'estimate'} — locked)
                </span>
              )}
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!(selectedEstimate || selectedJob)}
              style={{ ...selectStyle, opacity: selectedEstimate || selectedJob ? 0.7 : 1 }}
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Job Reference</label>
            <input
              value={jobReference}
              onChange={(e) => setJobReference(e.target.value)}
              placeholder="e.g. April — Weekly Cuts"
            />
          </div>

          {!selectedEstimate && !selectedJob && (
            <div className="field">
              <label>Total</label>
              <NumberInput value={total} onChange={setTotal} placeholder="0" style={inputStyle} />
              <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 6 }}>
                Creates a single line item. You can split it into multiple lines after creation.
              </div>
            </div>
          )}

          <div className="field">
            <label>Due Label</label>
            <input
              value={dueLabel}
              onChange={(e) => setDueLabel(e.target.value)}
              placeholder="Due May 5"
              style={inputStyle}
            />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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
            disabled={submitting || !clientId || !jobReference.trim()}
          >
            <Icon.check width="16" height="16" />{' '}
            {submitting
              ? 'Creating…'
              : selectedEstimate
                ? 'Create + copy lines'
                : selectedJob
                  ? 'Continue → pick receipts'
                  : 'Create invoice'}
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
const sourceHintStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--sage-50)',
  border: '1px solid var(--sage-100)',
  fontSize: 12.5,
  color: 'var(--forest-800)',
  lineHeight: 1.5,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
}
