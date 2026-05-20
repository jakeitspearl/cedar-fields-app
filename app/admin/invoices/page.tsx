import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import type { Client, Invoice, InvoiceLineItem } from '@/lib/data'
import { InvoicesPageClient, type EstimateRef, type JobRef } from './page.client'

const statusLabel: Record<Invoice['status'], string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
}

const qbStatusMap: Record<string, Invoice['qbStatus']> = {
  synced: 'synced',
  not_synced: 'not-synced',
  failed: 'failed',
}

type InvoiceRow = {
  id: string
  client_id: string
  estimate_id: string | null
  job_id: string | null
  job_reference: string
  status: Invoice['status']
  total_cents: number | null
  due_label: string | null
  apply_tax: boolean
  qb_status: string
  notes: string | null
  created_at: string
  clients: { id: string; name: string } | { id: string; name: string }[] | null
}

async function loadInvoices() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()

  const [invRes, itemsRes, clientsRes, estRes, jobsRes, companyRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, client_id, estimate_id, job_id, job_reference, status, total_cents, due_label, apply_tax, qb_status, notes, created_at, clients(id, name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('invoice_line_items')
      .select('id, invoice_id, position, name, qty, unit_price_cents, kind, cost_cents, markup_bps')
      .order('position'),
    supabase.from('clients').select('id, name, phone, email, address, initials').order('name'),
    supabase
      .from('estimates')
      .select('id, job_description, status, client_id, clients(name)')
      .in('status', ['accepted', 'sent', 'ready'])
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, kind, service, status, client_id, scheduled_date, estimate_id, clients(name)')
      .in('status', ['complete', 'in_progress'])
      .eq('kind', 'onetime')
      .order('scheduled_date', { ascending: false }),
    supabase.from('companies').select('id, sales_tax_bps, labor_rate_cents, disposal_rate_cents, qb_connected').eq('id', profile.companyId).maybeSingle(),
  ])

  if (invRes.error || clientsRes.error || estRes.error) return null

  type LineRow = {
    id: string
    invoice_id: string
    position: number
    name: string
    qty: number
    unit_price_cents: number
    kind: 'labor' | 'material' | 'disposal' | 'custom'
    cost_cents: number | null
    markup_bps: number | null
  }
  const itemsByInvoice: Record<string, InvoiceLineItem[]> = {}
  for (const r of (itemsRes.data ?? []) as LineRow[]) {
    ;(itemsByInvoice[r.invoice_id] ??= []).push({
      id: r.id,
      name: r.name,
      qty: Number(r.qty),
      price: r.unit_price_cents / 100,
      kind: r.kind,
      costCents: r.cost_cents ?? undefined,
      markupBps: r.markup_bps ?? undefined,
    })
  }

  const invoices: Invoice[] = ((invRes.data ?? []) as InvoiceRow[]).map((r) => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients
    return {
      id: r.id,
      clientId: r.client_id,
      client: client?.name ?? '—',
      job: r.job_reference,
      total: r.total_cents !== null ? r.total_cents / 100 : null,
      status: r.status,
      statusLabel: statusLabel[r.status],
      due: r.due_label ?? undefined,
      qbStatus: qbStatusMap[r.qb_status] ?? 'not-synced',
      fromEstimate: r.estimate_id ?? undefined,
      fromJob: r.job_id ?? undefined,
      lineItems: itemsByInvoice[r.id] ?? [],
      applyTax: r.apply_tax,
      notes: r.notes ?? '',
    }
  })

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

  type EstRow = {
    id: string
    job_description: string
    status: string
    client_id: string
    clients: { name: string } | { name: string }[] | null
  }
  const estimates: EstimateRef[] = ((estRes.data ?? []) as EstRow[]).map((e) => {
    const client = Array.isArray(e.clients) ? e.clients[0] : e.clients
    return {
      id: e.id,
      clientId: e.client_id,
      clientName: client?.name ?? '',
      job: e.job_description,
      status: e.status,
    }
  })

  type JobRow = {
    id: string
    kind: string
    service: string
    status: string
    client_id: string
    scheduled_date: string | null
    estimate_id: string | null
    clients: { name: string } | { name: string }[] | null
  }
  const jobs: JobRef[] = ((jobsRes.data ?? []) as JobRow[]).map((j) => {
    const client = Array.isArray(j.clients) ? j.clients[0] : j.clients
    return {
      id: j.id,
      clientId: j.client_id,
      clientName: client?.name ?? '',
      service: j.service,
      status: j.status,
      scheduledDate: j.scheduled_date,
      estimateId: j.estimate_id,
    }
  })

  const salesTaxBps = companyRes.data?.sales_tax_bps ?? 0
  const laborRateCents = companyRes.data?.labor_rate_cents ?? 4500
  const disposalRateCents = companyRes.data?.disposal_rate_cents ?? 8500
  const qbConnected = companyRes.data?.qb_connected ?? false

  return {
    invoices,
    clients,
    estimates,
    jobs,
    companyId: profile.companyId,
    companyName: profile.companyName,
    isOwner: profile.role === 'owner',
    salesTaxBps,
    laborRateCents,
    disposalRateCents,
    qbConnected,
  }
}

export default async function InvoicesPage() {
  const data = await loadInvoices()
  return (
    <InvoicesPageClient
      invoices={data?.invoices ?? null}
      clients={data?.clients ?? []}
      estimates={data?.estimates ?? []}
      jobs={data?.jobs ?? []}
      companyId={data?.companyId ?? null}
      companyName={data?.companyName ?? 'Cedar Fields Landscaping'}
      isOwner={data?.isOwner ?? false}
      salesTaxBps={data?.salesTaxBps ?? 0}
      laborRateCents={data?.laborRateCents ?? 4500}
      disposalRateCents={data?.disposalRateCents ?? 8500}
      qbConnected={data?.qbConnected ?? false}
    />
  )
}
