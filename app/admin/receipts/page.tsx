import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import type { Client, Receipt } from '@/lib/data'
import { ReceiptsPageClient } from './page.client'

const catLabel: Record<string, Receipt['category']> = {
  materials: 'Materials',
  gas: 'Gas',
  disposal: 'Disposal',
  other: 'Materials',
}
const catColor: Record<string, string> = {
  materials: '#6b8e4e',
  gas: '#c77a3c',
  disposal: '#7b6b4e',
  other: '#7b6b4e',
}

function fmtDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function loadReceipts(): Promise<
  { receipts: Receipt[]; clients: Client[]; companyId: string } | null
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null
  const supabase = await createClient()

  const [recRes, clientsRes] = await Promise.all([
    supabase
      .from('receipts')
      .select('id, vendor, amount_cents, category, occurred_on, client_id, clients(name)')
      .order('occurred_on', { ascending: false })
      .limit(50),
    supabase.from('clients').select('id, name, phone, email, address, initials').order('name'),
  ])

  if (recRes.error || !recRes.data) return null

  const receipts = recRes.data.map((r): Receipt => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients
    return {
      id: r.id,
      date: fmtDate(r.occurred_on),
      vendor: r.vendor ?? '—',
      amount: (r.amount_cents ?? 0) / 100,
      client: client?.name ?? 'Unassigned',
      category: catLabel[r.category] ?? 'Materials',
      color: catColor[r.category] ?? '#7b6b4e',
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

  return { receipts, clients, companyId: profile.companyId }
}

export default async function ReceiptsPage() {
  const data = await loadReceipts()
  return (
    <ReceiptsPageClient
      receipts={data?.receipts}
      clients={data?.clients ?? []}
      companyId={data?.companyId ?? null}
    />
  )
}
