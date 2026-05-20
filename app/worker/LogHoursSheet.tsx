'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'

export type WorkerJobOption = {
  id: string
  clientId: string | null
  clientName: string
  service: string
  kind: 'onetime' | 'recurring'
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function computeHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  if (endMins <= startMins) return 0
  return Math.round(((endMins - startMins) / 60) * 100) / 100
}

export function LogHoursSheet({
  jobs,
  preselectedJobId,
  companyId,
  workerId,
  onClose,
  onLogged,
}: {
  jobs: WorkerJobOption[]
  preselectedJobId?: string
  companyId: string
  workerId: string
  onClose: () => void
  onLogged: () => void
}) {
  const [jobId, setJobId] = useState<string>(preselectedJobId ?? jobs[0]?.id ?? '')
  const [workedOn, setWorkedOn] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState<string>('08:00')
  const [endTime, setEndTime] = useState<string>(nowHHMM())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hours = useMemo(() => computeHours(startTime, endTime), [startTime, endTime])

  async function submit() {
    setError(null)
    if (!jobId) {
      setError('Pick a job.')
      return
    }
    if (!startTime || !endTime) {
      setError('Enter a start and end time.')
      return
    }
    if (hours <= 0) {
      setError('End time must be after start time.')
      return
    }

    const selected = jobs.find((j) => j.id === jobId)
    setSubmitting(true)
    const supabase = createClient()

    // Build local-TZ timestamps for the start/end on the chosen date.
    // JS interprets `YYYY-MM-DDTHH:MM:00` (no `Z`) as the user's local time, then
    // toISOString() converts to UTC for storage.
    const startedAt = new Date(`${workedOn}T${startTime}:00`).toISOString()
    const endedAt = new Date(`${workedOn}T${endTime}:00`).toISOString()

    const { error: insErr } = await supabase.from('time_entries').insert({
      company_id: companyId,
      worker_id: workerId,
      job_id: jobId,
      client_id: selected?.clientId ?? null,
      started_at: startedAt,
      ended_at: endedAt,
      hours,
      notes: notes.trim() || null,
      submitted: true,
      submitted_at: new Date().toISOString(),
    })
    setSubmitting(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    onLogged()
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '88%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>Log Hours</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Job</label>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={selectStyle}>
              {jobs.length === 0 && <option value="">No jobs assigned</option>}
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.clientName} — {j.service}
                  {j.kind === 'recurring' ? ' (recurring)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Date Worked</label>
            <input
              type="date"
              value={workedOn}
              onChange={(e) => setWorkedOn(e.target.value)}
              style={inputStyle}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: -4,
              marginBottom: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: hours > 0 ? 'var(--sage-50)' : 'var(--cream-100)',
              border: '1px solid ' + (hours > 0 ? 'var(--sage-100)' : 'var(--cream-200)'),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontSize: 12.5, color: 'var(--stone-600)', fontWeight: 600 }}>Total</span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: hours > 0 ? 'var(--forest-800)' : 'var(--stone-500)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {hours > 0 ? hours.toFixed(2) : '—'}
              <span style={{ fontSize: 12, color: 'var(--stone-500)', fontWeight: 500, marginLeft: 4 }}>
                hrs
              </span>
            </span>
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you do?"
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
            disabled={submitting || !jobId || hours <= 0}
          >
            <Icon.check width="16" height="16" /> {submitting ? 'Saving…' : 'Log hours'}
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
