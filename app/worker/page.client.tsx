'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { TopBar } from '@/components/Shared'
import { LogHoursSheet, type WorkerJobOption } from './LogHoursSheet'

export type WorkerJobView = {
  id: string
  clientId: string | null
  clientName: string
  service: string
  kind: 'onetime' | 'recurring'
  scheduledDate: string | null
  nextDate: string | null
  frequency: string | null
  status: string
  notes: string
}

export type WeekSummary = {
  hoursLogged: number
  entryCount: number
}

function fmtPrettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WorkerTodayClient({
  jobs,
  weekSummary,
  loggedTodayJobIds,
  companyId,
  workerId,
  workerName: _workerName,
  today,
}: {
  jobs: WorkerJobView[]
  weekSummary: WeekSummary
  loggedTodayJobIds: string[]
  companyId: string
  workerId: string
  workerName: string
  today: string
}) {
  const loggedToday = useMemo(() => new Set(loggedTodayJobIds), [loggedTodayJobIds])
  const router = useRouter()
  const [sheetJobId, setSheetJobId] = useState<string | undefined>(undefined)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Today's one-time jobs (scheduled_date === today and not complete) + all recurring,
  // minus anything the worker has already logged hours for today.
  const todayJobs = useMemo(
    () =>
      jobs.filter((j) => {
        if (loggedToday.has(j.id)) return false
        if (j.kind === 'recurring') return true
        return j.scheduledDate === today && j.status !== 'complete'
      }),
    [jobs, today, loggedToday],
  )

  const upcoming = useMemo(
    () =>
      jobs
        .filter((j) => j.kind === 'onetime' && j.scheduledDate && j.scheduledDate > today)
        .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')),
    [jobs, today],
  )

  const jobOptions: WorkerJobOption[] = jobs.map((j) => ({
    id: j.id,
    clientId: j.clientId,
    clientName: j.clientName,
    service: j.service,
    kind: j.kind,
  }))

  function openLogFor(jobId?: string) {
    setSheetJobId(jobId)
    setSheetOpen(true)
  }

  function onLogged() {
    setSheetOpen(false)
    setSheetJobId(undefined)
    router.refresh()
  }

  return (
    <>
      <TopBar title="Today" sub={fmtPrettyDate(today)} />
      <div className="screen-body">
        <div
          className="card"
          style={{
            cursor: 'default',
            padding: 16,
            marginBottom: 18,
            background: 'var(--sage-50)',
            border: '1px solid var(--sage-100)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hours this week
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'var(--forest-800)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  marginTop: 2,
                }}
              >
                {weekSummary.hoursLogged}
                <span style={{ fontSize: 14, color: 'var(--stone-500)', fontWeight: 500, marginLeft: 4 }}>
                  hrs
                </span>
              </div>
            </div>
            <Link
              href="/worker/history"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--forest-700)',
                textDecoration: 'none',
              }}
            >
              View week →
            </Link>
          </div>
          <div style={{ fontSize: 12, color: 'var(--stone-500)', marginTop: 8 }}>
            {weekSummary.entryCount} {weekSummary.entryCount === 1 ? 'entry' : 'entries'} logged
          </div>
        </div>

        <div className="section-h">Your Jobs Today</div>
        {todayJobs.length === 0 ? (
          <div className="card" style={{ padding: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 14 }}>
            {loggedToday.size > 0 ? 'All caught up for today.' : 'No jobs scheduled for today.'}
          </div>
        ) : (
          todayJobs.map((j) => <JobCard key={j.id} job={j} onLog={() => openLogFor(j.id)} />)
        )}

        {upcoming.length > 0 && (
          <>
            <div className="section-h" style={{ marginTop: 22 }}>Upcoming</div>
            {upcoming.map((j) => (
              <JobCard key={j.id} job={j} onLog={() => openLogFor(j.id)} variant="upcoming" />
            ))}
          </>
        )}

        {jobs.length === 0 && (
          <div className="card" style={{ padding: 18, marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No jobs assigned yet</div>
            <div style={{ fontSize: 13, color: 'var(--stone-600)' }}>
              Your owner will assign you to jobs from the admin dashboard.
            </div>
          </div>
        )}
      </div>

      {sheetOpen && (
        <LogHoursSheet
          jobs={jobOptions}
          preselectedJobId={sheetJobId}
          companyId={companyId}
          workerId={workerId}
          onClose={() => setSheetOpen(false)}
          onLogged={onLogged}
        />
      )}
    </>
  )
}

function JobCard({
  job,
  onLog,
  variant,
}: {
  job: WorkerJobView
  onLog: () => void
  variant?: 'upcoming'
}) {
  const isRecurring = job.kind === 'recurring'
  const dateLabel = isRecurring
    ? job.frequency || ''
    : variant === 'upcoming'
      ? fmtShortDate(job.scheduledDate)
      : 'Today'
  return (
    <div className="card" style={{ cursor: 'default', padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{job.clientName}</div>
          <div style={{ fontSize: 13, color: 'var(--stone-600)', marginTop: 2 }}>{job.service}</div>
        </div>
        <span
          style={{
            fontSize: 11.5,
            color: isRecurring ? 'var(--forest-700)' : 'var(--cedar-700)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isRecurring && <Icon.repeat width="12" height="12" w={2.2} />}
          {dateLabel}
        </span>
      </div>
      {job.notes && (
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--stone-600)',
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--cream-100)',
            borderRadius: 10,
          }}
        >
          {job.notes}
        </div>
      )}
      <button
        onClick={onLog}
        className="btn btn-primary"
        style={{ marginTop: 12, height: 42, fontSize: 14, width: '100%' }}
      >
        <Icon.plus width="16" height="16" w={2.2} /> Log hours for this job
      </button>
    </div>
  )
}
