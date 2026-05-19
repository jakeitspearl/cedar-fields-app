import { Sidebar, WORKER_NAV } from '@/components/Sidebar'
import { MobileTabBar } from '@/components/MobileTabBar'
import { getSessionProfile } from '@/lib/supabase/profile'

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  const user = profile
    ? { name: profile.fullName, role: profile.role === 'owner' ? 'Owner' : 'Crew', authenticated: true }
    : { name: 'Demo', role: 'Crew' }
  const showRoleSwitch = !profile || profile.role === 'owner'

  return (
    <div className="shell">
      <Sidebar role="worker" nav={WORKER_NAV} user={user} showRoleSwitch={showRoleSwitch} />
      <main className="content">
        <div className="content-inner">{children}</div>
        <MobileTabBar nav={WORKER_NAV} />
      </main>
    </div>
  )
}
