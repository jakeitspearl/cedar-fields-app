import { createClient } from '@/lib/supabase/server'
import type { Receipt } from '@/lib/data'
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

async function loadReceipts(): Promise<Receipt[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('receipts')
    .select('id, vendor, amount_cents, category, occurred_on, client_id, clients(name)')
    .order('occurred_on', { ascending: false })
    .limit(50)

  if (error || !data) return null

  return data.map((r): Receipt => {
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
}

export default async function ReceiptsPage() {
  const receipts = await loadReceipts()
  return <ReceiptsPageClient receipts={receipts ?? undefined} />
}
