import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/data'
import { ClientsPageClient } from './page.client'

async function loadClients(): Promise<Client[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, email, address, initials')
    .order('name')

  if (error || !data) return null

  return data.map((c): Client => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    initials: c.initials ?? c.name.slice(0, 2).toUpperCase(),
    jobs: 0,
    open: 0,
  }))
}

export default async function ClientsPage() {
  const clients = await loadClients()
  return <ClientsPageClient clients={clients ?? undefined} />
}
