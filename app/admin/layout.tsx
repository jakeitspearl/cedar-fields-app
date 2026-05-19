import { Sidebar, ADMIN_NAV } from '@/components/Sidebar'
import { MobileTabBar } from '@/components/MobileTabBar'
import { getSessionProfile } from '@/lib/supabase/profile'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  const user = profile
    ? { name: profile.fullName, role: profile.role === 'owner' ? 'Owner' : 'Crew', authenticated: true }
    : { name: 'Demo', role: 'Owner' }

  return (
    <div className="shell">
      <Sidebar role="admin" nav={ADMIN_NAV} user={user} />
      <main className="content">
        <div className="content-inner">{children}</div>
        <MobileTabBar nav={ADMIN_NAV} />
      </main>
    </div>
  )
}
