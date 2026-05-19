'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/lib/icons'

export function TopBar({
  title,
  sub,
  right,
  onBack,
}: {
  title: string
  sub?: string
  right?: ReactNode
  onBack?: () => void
}) {
  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'var(--cream-100)',
              border: '1px solid var(--cream-200)',
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--forest-800)',
            }}
            aria-label="Back"
          >
            <Icon.back width="20" height="20" />
          </button>
        )}
        <div>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
      {right || <div className="avatar">S</div>}
    </div>
  )
}

export type TabId = 'estimates' | 'jobs' | 'clients' | 'invoices' | 'receipts'

export const TABS: { id: TabId; label: string; icon: keyof typeof Icon }[] = [
  { id: 'estimates', label: 'Estimates', icon: 'estimate' },
  { id: 'jobs', label: 'Jobs', icon: 'jobs' },
  { id: 'clients', label: 'Clients', icon: 'clients' },
  { id: 'invoices', label: 'Invoices', icon: 'invoices' },
  { id: 'receipts', label: 'Receipts', icon: 'receipts' },
]

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="tabbar">
      {TABS.map((t) => {
        const IconEl = Icon[t.icon]
        return (
          <button
            key={t.id}
            className={'tab' + (active === t.id ? ' active' : '')}
            onClick={() => onChange(t.id)}
          >
            <IconEl width="24" height="24" w={active === t.id ? 2 : 1.7} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Badge({ status, children }: { status: string; children: ReactNode }) {
  return <span className={'badge ' + status}>{children}</span>
}
