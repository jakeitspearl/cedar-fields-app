import { createClient } from './server'

export type SessionProfile = {
  userId: string
  companyId: string
  role: 'owner' | 'worker'
  fullName: string
  username: string | null
  companyName: string
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, company_id, role, full_name, username, companies(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return null

  // supabase-js types `companies` as an array when there's no FK hint; coerce.
  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies
  return {
    userId: data.id,
    companyId: data.company_id,
    role: data.role,
    fullName: data.full_name,
    username: data.username ?? null,
    companyName: company?.name ?? 'Cedar Fields',
  }
}
