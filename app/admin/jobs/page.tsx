import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import type { Client, OneTimeJob, RecurringJob } from '@/lib/data'
import { JobsPageClient, type WorkerOption, type EstimatePrefill } from './page.client'

const APP_STATUS: Record<string, OneTimeJob['status']> = {
  scheduled: 'scheduled',
  in_progress: 'in-progress',
  complete: 'complete',
}
const APP_STATUS_LABEL: Record<OneTimeJob['status'], string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  complete: 'Complete',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function loadJobs() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()

  const [jobsRes, jobWorkersRes, workersRes, clientsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select(
        'id, client_id, kind, service, status, price_cents, frequency, next_date, scheduled_date, notes, estimate_id, created_at, clients(id, name, initials)',
      )
      .order('created_at', { ascending: false }),
    supabase.from('job_workers').select('job_id, worker_id, profiles(id, full_name)'),
    supabase
      .from('profiles')
      .select('id, full_name, role, active')
      .eq('active', true)
      .order('full_name'),
    supabase.from('clients').select('id, name, phone, email, address, initials').order('name'),
  ])

  if (jobsRes.error || jobWorkersRes.error || workersRes.error || clientsRes.error) return null

  type JobWorkerRow = {
    job_id: string
    worker_id: string
    profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null
  }
  const workersByJob: Record<string, { id: string; name: string }[]> = {}
  for (const jw of (jobWorkersRes.data ?? []) as JobWorkerRow[]) {
    const prof = Array.isArray(jw.profiles) ? jw.profiles[0] : jw.profiles
    if (!prof) continue
    ;(workersByJob[jw.job_id] ??= []).push({ id: prof.id, name: prof.full_name })
  }

  const recurring: RecurringJob[] = []
  const oneTime: OneTimeJob[] = []

  type JobRow = {
    id: string
    client_id: string
    kind: 'onetime' | 'recurring'
    service: string
    status: string
    price_cents: number
    frequency: string | null
    next_date: string | null
    scheduled_date: string | null
    notes: string | null
    estimate_id: string | null
    created_at: string
    clients: { id: string; name: string; initials: string | null } | { id: string; name: string; initials: string | null }[] | null
  }

  for (const j of (jobsRes.data ?? []) as JobRow[]) {
    const client = Array.isArray(j.clients) ? j.clients[0] : j.clients
    const ws = workersByJob[j.id] ?? []

    if (j.kind === 'recurring') {
      recurring.push({
        id: j.id,
        clientId: j.client_id,
        client: client?.name ?? '—',
        service: j.service,
        price: j.price_cents / 100,
        frequency: j.frequency ?? '',
        next: fmtDate(j.next_date),
        nextDate: j.next_date ?? undefined,
        workerIds: ws.map((w) => w.id),
        workers: ws.map((w) => w.name),
        estimateId: j.estimate_id ?? undefined,
      })
    } else {
      const status = APP_STATUS[j.status] ?? 'scheduled'
      oneTime.push({
        id: j.id,
        clientId: j.client_id,
        client: client?.name ?? '—',
        type: j.service,
        workers: ws.map((w) => w.name),
        workerIds: ws.map((w) => w.id),
        status,
        statusLabel: APP_STATUS_LABEL[status],
        date: fmtDate(j.scheduled_date),
        scheduledDate: j.scheduled_date ?? undefined,
        notes: j.notes ?? '',
        price: j.price_cents / 100,
        estimateId: j.estimate_id ?? undefined,
      })
    }
  }

  const clients: Client[] = (clientsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    initials: c.initials ?? c.name.slice(0, 2).toUpperCase(),
    jobs: 0,
    open: 0,
  }))

  const workerOptions: WorkerOption[] = (workersRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role,
  }))

  return {
    recurring,
    oneTime,
    clients,
    workers: workerOptions,
    isOwner: profile.role === 'owner',
    companyId: profile.companyId,
  }
}

async function loadEstimatePrefill(estimateId: string): Promise<EstimatePrefill | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()
  const { data: est, error } = await supabase
    .from('estimates')
    .select(
      'id, client_id, job_description, labor_hours, yardage, disposal_yards, flat_fee_cents, clients(id, name)',
    )
    .eq('id', estimateId)
    .maybeSingle()
  if (error || !est) return null

  const { data: mats } = await supabase
    .from('estimate_materials')
    .select('qty, unit_price_cents, tbd')
    .eq('estimate_id', estimateId)

  const labor = Number(est.labor_hours) * 45
  const disposal = Number(est.disposal_yards) * 85
  const materials = (mats ?? []).reduce(
    (s, m) => s + (m.tbd ? 0 : Number(m.qty) * (m.unit_price_cents / 100)),
    0,
  )
  const flat = (est.flat_fee_cents ?? 0) / 100
  const total = flat > 0 ? flat : labor + disposal + materials

  const client = Array.isArray(est.clients) ? est.clients[0] : est.clients
  return {
    estimateId: est.id,
    clientId: est.client_id,
    clientName: client?.name ?? '',
    service: est.job_description || '',
    priceTotal: Math.round(total * 100) / 100,
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ fromEstimate?: string }>
}) {
  const params = await searchParams
  const [loaded, estimatePrefill] = await Promise.all([
    loadJobs(),
    params.fromEstimate ? loadEstimatePrefill(params.fromEstimate) : Promise.resolve(null),
  ])

  return (
    <JobsPageClient
      recurring={loaded?.recurring ?? []}
      oneTime={loaded?.oneTime ?? []}
      clients={loaded?.clients ?? []}
      workers={loaded?.workers ?? []}
      companyId={loaded?.companyId ?? null}
      isOwner={loaded?.isOwner ?? false}
      estimatePrefill={estimatePrefill}
    />
  )
}
