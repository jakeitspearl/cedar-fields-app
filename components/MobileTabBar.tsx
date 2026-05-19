'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/lib/icons'

type NavItem = { id: string; label: string; href: string; icon: keyof typeof Icon }

export function MobileTabBar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname()
  return (
    <div className="tabbar">
      {nav.map((t) => {
        const IconEl = Icon[t.icon]
        const active = pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href + '/'))
        return (
          <Link key={t.id} href={t.href} className={'tab' + (active ? ' active' : '')}>
            <IconEl width="24" height="24" w={active ? 2 : 1.7} />
            <span>{t.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
