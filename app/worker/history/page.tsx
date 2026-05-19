'use client'

import { TopBar } from '@/components/Shared'
import { money } from '@/lib/utils'

const weekEntries = [
  { day: 'Mon Apr 21', client: 'Johnson Property', hrs: 8, expenses: 384.22, notes: 'Retaining wall — base course' },
  { day: 'Mon Apr 21', client: 'Mike Delgado', hrs: 0, expenses: 42.0, notes: 'Dump fee — privet debris' },
  { day: 'Tue Apr 22', client: 'Johnson Property', hrs: 8, expenses: 1248.0, notes: 'Allan Block delivery + 2 courses' },
  { day: 'Wed Apr 23', client: 'Johnson Property', hrs: 2.5, expenses: 0, notes: 'Setup, then rain' },
]

export default function WorkerHistory() {
  const totalHrs = weekEntries.reduce((s, e) => s + e.hrs, 0)
  const totalExp = weekEntries.reduce((s, e) => s + e.expenses, 0)
  return (
    <>
      <TopBar title="My Week" sub="Apr 21 — Apr 27" />
      <div className="screen-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div className="card" style={{ cursor: 'default', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.05 }}>
              Hours
            </div>
            <div
              style={{
                fontSize: 30, fontWeight: 700, color: 'var(--forest-800)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
              }}
            >
              {totalHrs}
            </div>
          </div>
          <div className="card" style={{ cursor: 'default', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.05 }}>
              Expenses
            </div>
            <div
              style={{
                fontSize: 30, fontWeight: 700, color: 'var(--cedar-700)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
              }}
            >
              {money(totalExp, 0)}
            </div>
          </div>
        </div>

        <div className="section-h">Entries</div>
        {weekEntries.map((e, i) => (
          <div key={i} className="card" style={{ cursor: 'default', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{e.client}</div>
              <div style={{ fontSize: 12, color: 'var(--stone-500)' }}>{e.day}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--stone-600)', marginTop: 4 }}>{e.notes}</div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid var(--cream-200)',
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {e.hrs > 0 && (
                <span style={{ color: 'var(--forest-700)', fontWeight: 700 }}>
                  {e.hrs} hrs
                </span>
              )}
              {e.expenses > 0 && (
                <span style={{ color: 'var(--cedar-700)', fontWeight: 700 }}>
                  {money(e.expenses)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
