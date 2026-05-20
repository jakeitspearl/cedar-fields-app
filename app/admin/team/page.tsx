import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import { TeamPageClient, type TeamMember } from './page.client'

async function loadTeam(): Promise<{ me: TeamMember; members: TeamMember[] } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  const profile = await getSessionProfile()
  if (!profile) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, active, created_at')
    .order('created_at', { ascending: true })

  if (error || !data) return null

  const members: TeamMember[] = data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    username: p.username ?? null,
    role: p.role,
    active: p.active,
    isMe: p.id === profile.userId,
  }))
  const me = members.find((m) => m.isMe)!
  return { me, members }
}

export default async function TeamPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'owner') redirect('/admin')

  const data = await loadTeam()
  return <TeamPageClient members={data?.members ?? []} me={data?.me ?? null} />
}
