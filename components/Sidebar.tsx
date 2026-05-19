'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { signOut } from '@/app/actions'

type NavItem = { id: string; label: string; href: string; icon: keyof typeof Icon }

export const ADMIN_NAV: NavItem[] = [
  { id: 'estimates', label: 'Estimates', href: '/admin/estimates', icon: 'estimate' },
  { id: 'jobs', label: 'Jobs', href: '/admin/jobs', icon: 'jobs' },
  { id: 'clients', label: 'Clients', href: '/admin/clients', icon: 'clients' },
  { id: 'invoices', label: 'Invoices', href: '/admin/invoices', icon: 'invoices' },
  { id: 'receipts', label: 'Receipts', href: '/admin/receipts', icon: 'receipts' },
]

export const WORKER_NAV: NavItem[] = [
  { id: 'today', label: 'Today', href: '/worker', icon: 'jobs' },
  { id: 'log', label: 'Log Expense', href: '/worker/log', icon: 'receipts' },
  { id: 'history', label: 'My Week', href: '/worker/history', icon: 'estimate' },
]

export function Sidebar({
  role,
  nav,
  user,
  showRoleSwitch = true,
}: {
  role: 'admin' | 'worker'
  nav: NavItem[]
  user: { name: string; role: string; authenticated?: boolean }
  showRoleSwitch?: boolean
}) {
  const pathname = usePathname()
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">CF</div>
        <div>
          <div className="brand-name">Cedar Fields</div>
          <div className="brand-sub">Landscaping</div>
        </div>
      </div>

      {showRoleSwitch && (
        <div className="role-switch">
          <Link href="/admin" className={role === 'admin' ? 'on' : ''}>Owner</Link>
          <Link href="/worker" className={role === 'worker' ? 'on' : ''}>Worker</Link>
        </div>
      )}

      <nav className="side-nav">
        {nav.map((item) => {
          const IconEl = Icon[item.icon]
          const active =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          return (
            <Link key={item.id} href={item.href} className={active ? 'on' : ''}>
              <IconEl width="18" height="18" w={active ? 2 : 1.7} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="side-foot">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--cedar-600)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {user.name[0]?.toUpperCase() || '?'}
        </div>
        <div className="who">
          <div className="name">{user.name}</div>
          <div className="role">{user.role}</div>
        </div>
        {user.authenticated && (
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
