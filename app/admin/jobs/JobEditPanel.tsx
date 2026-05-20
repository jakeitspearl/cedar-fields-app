'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/utils'
import type { OneTimeJob, RecurringJob, Client } from '@/lib/data'
import { NumberInput } from '@/components/NumberInput'
import { Badge } from '@/components/Shared'
import type { WorkerOption } from './page.client'

type AnyJob = (OneTimeJob & { kind: 'onetime' }) | (RecurringJob & { kind: 'recurring' })

const APP_STATUS_LABEL: Record<OneTimeJob['status'], string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  complete: 'Complete',
}
const APP_TO_DB_STATUS: Record<OneTimeJob['status'], string> = {
  scheduled: 'scheduled',
  'in-progress': 'in_progress',
  complete: 'complete',
}

const STATUS_OPTIONS: OneTimeJob['status'][] = ['scheduled', 'in-progress', 'complete']
const statusBadgeMap: Record<string, string> = {
  scheduled: 'pending',
  'in-progress': 'ready',
  complete: 'paid',
}

export function JobEditPanel({
  initial,
  clients,
  workers,
  canEdit,
}: {
  initial: AnyJob
  clients: Client[]
  workers: WorkerOption[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [job, setJob] = useState<AnyJob>(initial)
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)

  function patch<T extends AnyJob>(p: Partial<T>) {
    setJob((prev) => ({ ...prev, ...p } as AnyJob))
  }

  async function persistFields(payload: Record<string, unknown>) {
    if (!canEdit) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('jobs').update(payload).eq('id', job.id)
    setBusy(false)
    if (error) setError(error.message)
    else startTransition(() => router.refresh())
  }

  async function toggleWorker(workerId: string, workerName: string) {
    if (!canEdit) return
    setError(null)
    const isAssigned = (job.workerIds ?? []).includes(workerId)
    const supabase = createClient()
    if (isAssigned) {
      patch({
        workerIds: (job.workerIds ?? []).filter((id) => id !== workerId),
        workers: (job.workers ?? []).filter((n) => n !== workerName),
      } as Partial<AnyJob>)
      const { error } = await supabase
        .from('job_workers')
        .delete()
        .eq('job_id', job.id)
        .eq('worker_id', workerId)
      if (error) setError(error.message)
    } else {
      patch({
        workerIds: [...(job.workerIds ?? []), workerId],
        workers: [...(job.workers ?? []), workerName],
      } as Partial<AnyJob>)
      const { error } = await supabase
        .from('job_workers')
        .insert({ job_id: job.id, worker_id: workerId })
      if (error) setError(error.message)
    }
    startTransition(() => router.refresh())
  }

  async function deleteJob() {
    if (!canEdit) return
    if (!confirm('Delete this job? This cannot be undone.')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('jobs').delete().eq('id', job.id)
    setBusy(false)
    if (error) setError(error.message)
    else {
      router.push('/admin/jobs')
      router.refresh()
    }
  }

  const isOneTime = job.kind === 'onetime'

  return (
    <>
      {error && (
        <div className="banner err" style={{ marginBottom: 10 }}>
          <div>{error}</div>
        </div>
      )}

      <div className="field">
        <label>Client</label>
        <select
          value={job.clientId ?? ''}
          disabled={!canEdit || busy}
          onChange={(e) => {
            const newClientId = e.target.value
            const c = clients.find((x) => x.id === newClientId)
            patch({ clientId: newClientId, client: c?.name ?? '' } as Partial<AnyJob>)
            persistFields({ client_id: newClientId })
          }}
          style={selectStyle}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Project / Service</label>
        <input
          value={isOneTime ? job.type : job.service}
          disabled={!canEdit || busy}
          onChange={(e) => {
            const v = e.target.value
            if (isOneTime) patch({ type: v } as Partial<OneTimeJob>)
            else patch({ service: v } as Partial<RecurringJob>)
          }}
          onBlur={(e) => persistFields({ service: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Price {!isOneTime && '(per visit)'}</label>
          <NumberInput
            value={job.price}
            onChange={(n) => patch({ price: n } as Partial<AnyJob>)}
            onBlur={() => persistFields({ price_cents: Math.round(job.price * 100) })}
            disabled={!canEdit}
            style={inputStyle}
          />
        </div>
        {isOneTime ? (
          <div className="field" style={{ flex: 1 }}>
            <label>Status</label>
            <button
              type="button"
              onClick={() => setStatusOpen((s) => !s)}
              disabled={!canEdit || busy}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <Badge status={statusBadgeMap[job.status]}>{job.statusLabel}</Badge>
              <Icon.chev width="14" height="14" />
            </button>
            {statusOpen && (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setStatusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 0,
                    left: 0,
                    zIndex: 31,
                    background: '#fff',
                    border: '1px solid var(--cream-200)',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(18,39,27,0.12)',
                    padding: 6,
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusOpen(false)
                        if (s === job.status) return
                        patch({ status: s, statusLabel: APP_STATUS_LABEL[s] } as Partial<OneTimeJob>)
                        persistFields({ status: APP_TO_DB_STATUS[s] })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        background: s === job.status ? 'var(--cream-100)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        borderRadius: 8,
                      }}
                    >
                      <Badge status={statusBadgeMap[s]}>{APP_STATUS_LABEL[s]}</Badge>
                      {s === job.status && <Icon.check width="16" height="16" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isOneTime ? (
        <div className="field">
          <label>Scheduled Date</label>
          <input
            type="date"
            value={job.scheduledDate ?? ''}
            disabled={!canEdit || busy}
            onChange={(e) => {
              patch({ scheduledDate: e.target.value } as Partial<OneTimeJob>)
              persistFields({ scheduled_date: e.target.value || null })
            }}
            style={inputStyle}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Frequency</label>
            <input
              value={job.frequency}
              disabled={!canEdit || busy}
              onChange={(e) => patch({ frequency: e.target.value } as Partial<RecurringJob>)}
              onBlur={(e) => persistFields({ frequency: e.target.value })}
              placeholder="e.g. Weekly · Tuesdays"
              style={inputStyle}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Next Visit</label>
            <input
              type="date"
              value={job.nextDate ?? ''}
              disabled={!canEdit || busy}
              onChange={(e) => {
                patch({ nextDate: e.target.value } as Partial<RecurringJob>)
                persistFields({ next_date: e.target.value || null })
              }}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div className="section-h" style={{ marginTop: 18 }}>
        <span>Crew</span>
        <span className="count">{job.workerIds?.length ?? 0}</span>
      </div>
      <div className="card" style={{ padding: 14, cursor: 'default' }}>
        {workers.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--stone-500)' }}>
            No team members yet. Add them from the <strong>Team</strong> page.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {workers.map((w) => {
              const on = (job.workerIds ?? []).includes(w.id)
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={!canEdit || busy}
                  onClick={() => toggleWorker(w.id, w.name)}
                  style={chipStyle(on)}
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
        )}
      </div>

      {isOneTime && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>Notes</label>
          <textarea
            value={job.notes}
            disabled={!canEdit || busy}
            onChange={(e) => patch({ notes: e.target.value } as Partial<OneTimeJob>)}
            onBlur={(e) => persistFields({ notes: e.target.value || null })}
            rows={3}
            placeholder="Access info, parking, special instructions…"
          />
        </div>
      )}

      <div
        className="card"
        style={{
          cursor: 'default',
          padding: 14,
          marginTop: 18,
          background: 'var(--forest-800)',
          color: 'var(--cream-50)',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 600 }}>
            {isOneTime ? 'TOTAL' : 'PER VISIT'}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {money(job.price, 0)}
          </div>
        </div>
        {job.estimateId && (
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            From estimate #{job.estimateId.slice(0, 8).toUpperCase()}
          </div>
        )}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={deleteJob}
          disabled={busy}
          style={{
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'transparent',
            color: '#a02020',
            border: '1px solid #f3c4c4',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          Delete job
        </button>
      )}
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

function chipStyle(on: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid ' + (on ? 'var(--forest-700)' : 'var(--cream-200)'),
    background: on ? 'var(--forest-700)' : '#fff',
    color: on ? '#fff' : 'var(--ink-900)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
