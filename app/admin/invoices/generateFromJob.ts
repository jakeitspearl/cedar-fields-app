'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import { revalidatePath } from 'next/cache'

export type ReceiptOption = {
  id: string
  vendor: string
  amountCents: number
  category: string
  occurredOn: string
}

export type JobInvoiceContext = {
  job: {
    id: string
    clientId: string
    clientName: string
    service: string
    scheduledDate: string | null
    estimateId: string | null
  }
  laborHours: number
  receipts: ReceiptOption[]
  disposalYards: number       // from linked estimate, if any
  laborRateCents: number
  disposalRateCents: number
}

// Load everything the GenerateFromJobSheet needs to render its preview.
export async function loadJobInvoiceContext(jobId: string): Promise<
  { ok: true; data: JobInvoiceContext } | { ok: false; error: string }
> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Owner-only.' }

  const supabase = await createClient()

  const [jobRes, companyRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, client_id, service, scheduled_date, estimate_id, clients(name)')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('companies')
      .select('labor_rate_cents, disposal_rate_cents')
      .eq('id', profile.companyId)
      .maybeSingle(),
  ])

  if (jobRes.error || !jobRes.data) return { ok: false, error: 'Job not found.' }
  const job = jobRes.data
  const client = Array.isArray(job.clients) ? job.clients[0] : job.clients
  const laborRateCents = companyRes.data?.labor_rate_cents ?? 4500
  const disposalRateCents = companyRes.data?.disposal_rate_cents ?? 8500

  // Sum time entries for this job
  const { data: entries } = await supabase
    .from('time_entries')
    .select('hours')
    .eq('job_id', jobId)
  const laborHours = (entries ?? []).reduce((s, e) => s + Number(e.hours ?? 0), 0)

  // Pull receipts for this client around the job's date.
  // Window: scheduled_date ± 14 days. If no scheduled_date, last 60 days.
  let fromDate: string
  let toDate: string
  if (job.scheduled_date) {
    const d = new Date(job.scheduled_date + 'T00:00:00Z')
    fromDate = new Date(d.getTime() - 14 * 86400000).toISOString().slice(0, 10)
    toDate = new Date(d.getTime() + 14 * 86400000).toISOString().slice(0, 10)
  } else {
    const today = new Date()
    fromDate = new Date(today.getTime() - 60 * 86400000).toISOString().slice(0, 10)
    toDate = today.toISOString().slice(0, 10)
  }

  const { data: receiptsData } = await supabase
    .from('receipts')
    .select('id, vendor, amount_cents, category, occurred_on')
    .eq('client_id', job.client_id)
    .gte('occurred_on', fromDate)
    .lte('occurred_on', toDate)
    .order('occurred_on', { ascending: false })

  const receipts: ReceiptOption[] = (receiptsData ?? []).map((r) => ({
    id: r.id,
    vendor: r.vendor ?? '—',
    amountCents: r.amount_cents,
    category: r.category,
    occurredOn: r.occurred_on,
  }))

  // Disposal from linked estimate, if any
  let disposalYards = 0
  if (job.estimate_id) {
    const { data: est } = await supabase
      .from('estimates')
      .select('disposal_yards')
      .eq('id', job.estimate_id)
      .maybeSingle()
    disposalYards = Number(est?.disposal_yards ?? 0)
  }

  return {
    ok: true,
    data: {
      job: {
        id: job.id,
        clientId: job.client_id,
        clientName: client?.name ?? '—',
        service: job.service,
        scheduledDate: job.scheduled_date,
        estimateId: job.estimate_id,
      },
      laborHours,
      receipts,
      disposalYards,
      laborRateCents,
      disposalRateCents,
    },
  }
}

export type GenerateFromJobInput = {
  invoiceId: string
  jobId: string
  laborHours: number
  receiptIds: string[]
  materialsMarkupBps: number
  includeDisposal: boolean
}

export type GenerateResult = { ok: true } | { ok: false; error: string }

export async function generateLinesFromJob(input: GenerateFromJobInput): Promise<GenerateResult> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Owner-only.' }

  const ctxRes = await loadJobInvoiceContext(input.jobId)
  if (!ctxRes.ok) return { ok: false, error: ctxRes.error }
  const ctx = ctxRes.data

  const supabase = await createClient()

  // Wipe existing lines on this invoice
  const { error: delErr } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', input.invoiceId)
  if (delErr) return { ok: false, error: delErr.message }

  const lines: Array<{
    invoice_id: string
    position: number
    name: string
    qty: number
    unit_price_cents: number
    kind: 'labor' | 'material' | 'disposal' | 'custom'
    cost_cents: number | null
    markup_bps: number | null
  }> = []
  let pos = 0

  if (input.laborHours > 0) {
    lines.push({
      invoice_id: input.invoiceId,
      position: pos++,
      name: 'Labor',
      qty: input.laborHours,
      unit_price_cents: ctx.laborRateCents,
      kind: 'labor',
      cost_cents: null,
      markup_bps: null,
    })
  }

  const selectedReceipts = ctx.receipts.filter((r) => input.receiptIds.includes(r.id))
  const totalCostCents = selectedReceipts.reduce((s, r) => s + r.amountCents, 0)
  if (totalCostCents > 0) {
    const markedUpCents = Math.round(totalCostCents * (1 + input.materialsMarkupBps / 10000))
    lines.push({
      invoice_id: input.invoiceId,
      position: pos++,
      name: 'Materials',
      qty: 1,
      unit_price_cents: markedUpCents,
      kind: 'material',
      cost_cents: totalCostCents,
      markup_bps: input.materialsMarkupBps,
    })
  }

  if (input.includeDisposal && ctx.disposalYards > 0) {
    lines.push({
      invoice_id: input.invoiceId,
      position: pos++,
      name: 'Disposal',
      qty: ctx.disposalYards,
      unit_price_cents: ctx.disposalRateCents,
      kind: 'disposal',
      cost_cents: null,
      markup_bps: null,
    })
  }

  if (lines.length > 0) {
    const { error: insErr } = await supabase.from('invoice_line_items').insert(lines)
    if (insErr) return { ok: false, error: insErr.message }
  }

  const total = lines.reduce((s, l) => s + l.qty * l.unit_price_cents, 0)
  await supabase
    .from('invoices')
    .update({
      job_id: input.jobId,
      client_id: ctx.job.clientId,
      estimate_id: ctx.job.estimateId,
      job_reference: ctx.job.service,
      total_cents: total,
    })
    .eq('id', input.invoiceId)

  revalidatePath('/admin/invoices')
  return { ok: true }
}
