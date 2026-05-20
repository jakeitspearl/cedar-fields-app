import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import { WorkerTodayClient, type WorkerJobView, type WeekSummary } from './page.client'

type JobRow = {
  id: string
  client_id: string
  kind: 'onetime' | 'recurring'
  service: string
  status: string
  scheduled_date: string | null
  next_date: string | null
  frequency: string | null
  notes: string | null
  clients: { id: string; name: string } | { id: string; name: string }[] | null
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function startOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay() // 0 = Sun
  const diff = (day + 6) % 7 // Monday-first week
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function loadWorker() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()

  // 1) Jobs assigned to me via job_workers
  const { data: assignments } = await supabase
    .from('job_workers')
    .select('job_id, jobs(id, client_id, kind, service, status, scheduled_date, next_date, frequency, notes, clients(id, name))')
    .eq('worker_id', profile.userId)

  type Assignment = {
    job_id: string
    jobs: JobRow | JobRow[] | null
  }

  const jobs: WorkerJobView[] = []
  for (const a of (assignments ?? []) as Assignment[]) {
    const j = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs
    if (!j) continue
    const client = Array.isArray(j.clients) ? j.clients[0] : j.clients
    jobs.push({
      id: j.id,
      clientId: j.client_id,
      clientName: client?.name ?? '—',
      service: j.service,
      kind: j.kind,
      scheduledDate: j.scheduled_date ?? null,
      nextDate: j.next_date ?? null,
      frequency: j.frequency ?? null,
      status: j.status,
      notes: j.notes ?? '',
    })
  }

  // 2) Week summary (sum of hours since Monday)
  const since = startOfWeekISO()
  const { data: entries } = await supabase
    .from('time_entries')
    .select('hours, started_at, job_id')
    .eq('worker_id', profile.userId)
    .gte('started_at', since)

  const weekTotal = (entries ?? []).reduce((s, e) => s + Number(e.hours ?? 0), 0)
  const weekSummary: WeekSummary = {
    hoursLogged: Math.round(weekTotal * 100) / 100,
    entryCount: entries?.length ?? 0,
  }

  // 3) Job ids the worker already logged hours for *today* — used to hide them
  //    from the Today list so they don't double-log.
  const today = todayISO()
  const dayStart = `${today}T00:00:00.000Z`
  const dayEnd = new Date(new Date(dayStart).getTime() + 86400000).toISOString()
  const loggedTodayJobIds = new Set<string>(
    ((entries ?? []) as { job_id: string | null; started_at: string }[])
      .filter((e) => e.job_id && e.started_at >= dayStart && e.started_at < dayEnd)
      .map((e) => e.job_id as string),
  )

  return {
    jobs,
    weekSummary,
    loggedTodayJobIds: Array.from(loggedTodayJobIds),
    companyId: profile.companyId,
    workerId: profile.userId,
    workerName: profile.fullName,
    today,
  }
}

export default async function WorkerToday() {
  const data = await loadWorker()
  if (!data) {
    return (
      <div className="screen-body">
        <div className="card" style={{ padding: 18 }}>Sign in required.</div>
      </div>
    )
  }
  return (
    <WorkerTodayClient
      jobs={data.jobs}
      weekSummary={data.weekSummary}
      loggedTodayJobIds={data.loggedTodayJobIds}
      companyId={data.companyId}
      workerId={data.workerId}
      workerName={data.workerName}
      today={data.today}
    />
  )
}
