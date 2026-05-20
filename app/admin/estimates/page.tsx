import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import type { Client, Estimate, Material } from '@/lib/data'
import { EstimatesPageClient, type AttachmentView } from './page.client'

const statusLabel: Record<Estimate['status'], string> = {
  draft: 'Draft',
  pending: 'Pending Materials',
  ready: 'Ready to Send',
  sent: 'Sent',
  accepted: 'Accepted',
}

function fmtDate(s: string | null | undefined) {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type EstimateRow = {
  id: string
  client_id: string
  job_description: string
  status: Estimate['status']
  labor_hours: number
  yardage: number
  disposal_yards: number
  flat_fee_cents: number | null
  flat_fee_label: string | null
  created_at: string
  clients: { id: string; name: string; initials: string | null } | { id: string; name: string; initials: string | null }[] | null
}

type MaterialRow = {
  id: string
  estimate_id: string
  position: number
  name: string
  qty: number
  unit_price_cents: number
  tbd: boolean
  tbd_note: string | null
}

type AttachmentRow = {
  id: string
  estimate_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  kind: string
  uploader_id: string | null
  created_at: string
}

async function loadEstimates(): Promise<{
  estimates: Estimate[]
  attachmentsByEstimate: Record<string, AttachmentView[]>
  clients: Client[]
  companyId: string
  companyName: string
  isOwner: boolean
} | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null

  const supabase = await createClient()
  const [estRes, matRes, attRes, clientsRes] = await Promise.all([
    supabase
      .from('estimates')
      .select('id, client_id, job_description, status, labor_hours, yardage, disposal_yards, flat_fee_cents, flat_fee_label, created_at, clients(id, name, initials)')
      .order('created_at', { ascending: false }),
    supabase
      .from('estimate_materials')
      .select('id, estimate_id, position, name, qty, unit_price_cents, tbd, tbd_note')
      .order('position'),
    supabase
      .from('estimate_attachments')
      .select('id, estimate_id, storage_path, file_name, mime_type, size_bytes, kind, uploader_id, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('clients')
      .select('id, name, phone, email, address, initials')
      .order('name'),
  ])

  if (estRes.error || matRes.error || attRes.error || clientsRes.error) return null

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

  const materialsByEstimate: Record<string, Material[]> = {}
  for (const m of (matRes.data ?? []) as MaterialRow[]) {
    ;(materialsByEstimate[m.estimate_id] ??= []).push({
      id: m.id,
      name: m.name,
      qty: Number(m.qty),
      price: m.unit_price_cents / 100,
      tbd: m.tbd,
      tbdNote: m.tbd_note ?? undefined,
    })
  }

  // Sign URLs in parallel; valid for 1 hour
  const attachmentRows = (attRes.data ?? []) as AttachmentRow[]
  const signed = await Promise.all(
    attachmentRows.map((a) => supabase.storage.from('estimate-attachments').createSignedUrl(a.storage_path, 3600)),
  )
  const attachmentsByEstimate: Record<string, AttachmentView[]> = {}
  attachmentRows.forEach((a, i) => {
    ;(attachmentsByEstimate[a.estimate_id] ??= []).push({
      id: a.id,
      fileName: a.file_name,
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      kind: a.kind === 'image' || a.kind === 'video' ? a.kind : 'other',
      url: signed[i]?.data?.signedUrl ?? null,
      createdAt: a.created_at,
    })
  })

  const estimates: Estimate[] = ((estRes.data ?? []) as EstimateRow[]).map((e) => {
    const client = Array.isArray(e.clients) ? e.clients[0] : e.clients
    return {
      id: e.id,
      clientId: e.client_id,
      client: client?.name ?? '—',
      job: e.job_description,
      date: fmtDate(e.created_at),
      status: e.status,
      statusLabel: statusLabel[e.status],
      laborHrs: Number(e.labor_hours),
      yardage: Number(e.yardage),
      disposal: Number(e.disposal_yards),
      disposalRate: 85,
      materials: materialsByEstimate[e.id] ?? [],
      ...(e.flat_fee_cents
        ? { flatFee: e.flat_fee_cents / 100, flatFeeLabel: e.flat_fee_label ?? undefined }
        : {}),
    }
  })

  return {
    estimates,
    attachmentsByEstimate,
    clients,
    companyId: profile.companyId,
    companyName: profile.companyName,
    isOwner: profile.role === 'owner',
  }
}

export default async function EstimatesPage() {
  const loaded = await loadEstimates()
  return (
    <EstimatesPageClient
      estimates={loaded?.estimates ?? null}
      attachmentsByEstimate={loaded?.attachmentsByEstimate ?? {}}
      clients={loaded?.clients ?? []}
      companyId={loaded?.companyId ?? null}
      companyName={loaded?.companyName ?? 'Cedar Fields Landscaping'}
      isOwner={loaded?.isOwner ?? false}
    />
  )
}
