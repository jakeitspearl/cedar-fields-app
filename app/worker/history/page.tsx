import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import { WorkerHistoryClient, type HistoryEntry, type ScheduleItem } from './page.client'

function startOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function endOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff + 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function loadHistory() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()

  const since = startOfWeekISO()
  const until = endOfWeekISO()
  const weekStart = since.slice(0, 10)
  const weekEnd = new Date(new Date(until).getTime() - 86400000).toISOString().slice(0, 10)

  const [entriesRes, assignRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('id, started_at, hours, notes, job_id, client_id, jobs(service), clients(name)')
      .eq('worker_id', profile.userId)
      .gte('started_at', since)
      .lt('started_at', until)
      .order('started_at', { ascending: false }),
    supabase
      .from('job_workers')
      .select('jobs(id, kind, service, scheduled_date, next_date, frequency, notes, clients(id, name))')
      .eq('worker_id', profile.userId),
  ])

  type EntryRow = {
    id: string
    started_at: string
    hours: number | null
    notes: string | null
    job_id: string | null
    client_id: string | null
    jobs: { service: string } | { service: string }[] | null
    clients: { name: string } | { name: string }[] | null
  }
  const entries: HistoryEntry[] = ((entriesRes.data ?? []) as EntryRow[]).map((r) => {
    const job = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients
    return {
      id: r.id,
      hours: Number(r.hours ?? 0),
      notes: r.notes ?? '',
      service: job?.service ?? '',
      clientName: client?.name ?? '—',
      startedAt: r.started_at,
      jobId: r.job_id,
    }
  })

  // Build a Set of (jobId-day) markers for jobs already logged this week —
  // used to flag "✓ Logged" on schedule cards.
  const loggedByDay = new Set<string>()
  for (const e of entries) {
    if (e.jobId) loggedByDay.add(`${e.jobId}|${e.startedAt.slice(0, 10)}`)
  }
  const loggedJobIds = new Set(entries.map((e) => e.jobId).filter((id): id is string => Boolean(id)))

  type AssignmentRow = {
    jobs:
      | {
          id: string
          kind: 'onetime' | 'recurring'
          service: string
          scheduled_date: string | null
          next_date: string | null
          frequency: string | null
          notes: string | null
          clients: { id: string; name: string } | { id: string; name: string }[] | null
        }
      | {
          id: string
          kind: 'onetime' | 'recurring'
          service: string
          scheduled_date: string | null
          next_date: string | null
          frequency: string | null
          notes: string | null
          clients: { id: string; name: string } | { id: string; name: string }[] | null
        }[]
      | null
  }
  const schedule: ScheduleItem[] = []
  for (const a of (assignRes.data ?? []) as AssignmentRow[]) {
    const j = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs
    if (!j) continue
    const client = Array.isArray(j.clients) ? j.clients[0] : j.clients
    if (j.kind === 'onetime') {
      if (!j.scheduled_date) continue
      if (j.scheduled_date < weekStart || j.scheduled_date > weekEnd) continue
      schedule.push({
        id: j.id,
        kind: 'onetime',
        clientName: client?.name ?? '—',
        service: j.service,
        notes: j.notes ?? '',
        scheduledDate: j.scheduled_date,
        frequency: null,
        loggedThisWeek: loggedByDay.has(`${j.id}|${j.scheduled_date}`) || loggedJobIds.has(j.id),
      })
    } else {
      schedule.push({
        id: j.id,
        kind: 'recurring',
        clientName: client?.name ?? '—',
        service: j.service,
        notes: j.notes ?? '',
        scheduledDate: null,
        frequency: j.frequency ?? '',
        loggedThisWeek: loggedJobIds.has(j.id),
      })
    }
  }

  return {
    entries,
    schedule,
    weekStart,
    weekEnd,
  }
}

export default async function WorkerHistory() {
  const data = await loadHistory()
  if (!data) {
    return (
      <div className="screen-body">
        <div className="card" style={{ padding: 18 }}>Sign in required.</div>
      </div>
    )
  }
  return (
    <WorkerHistoryClient
      entries={data.entries}
      schedule={data.schedule}
      weekStart={data.weekStart}
      weekEnd={data.weekEnd}
    />
  )
}
