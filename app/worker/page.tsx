'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA } from '@/lib/data'
import { money } from '@/lib/utils'
import { TopBar } from '@/components/Shared'

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function WorkerToday() {
  const todaysJobs = DATA.oneTimeJobs.filter((j) => j.status !== 'complete').slice(0, 2)
  const [punchedInAt, setPunchedInAt] = useState<number | null>(null)
  const [activeClient, setActiveClient] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!punchedInAt) return
    const id = setInterval(() => setElapsed(Date.now() - punchedInAt), 1000)
    return () => clearInterval(id)
  }, [punchedInAt])

  const punchIn = (client: string) => {
    setActiveClient(client)
    setPunchedInAt(Date.now())
    setElapsed(0)
  }
  const punchOut = () => {
    setPunchedInAt(null)
    setActiveClient(null)
  }

  return (
    <>
      <TopBar title="Today" sub="Wednesday · Apr 23" />
      <div className="screen-body">
        {/* Punch card */}
        {punchedInAt ? (
          <div
            className="card"
            style={{
              cursor: 'default',
              padding: 20,
              background: 'linear-gradient(135deg, var(--forest-700), var(--forest-800))',
              color: 'var(--cream-50)',
              border: 'none',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              On the Clock · {activeClient}
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              {fmtElapsed(elapsed)}
            </div>
            <button
              onClick={punchOut}
              className="btn btn-cedar btn-block"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              Punch Out
            </button>
          </div>
        ) : (
          <div
            className="card"
            style={{
              cursor: 'default',
              padding: 18,
              marginBottom: 16,
              background: 'var(--sage-50)',
              border: '1px dashed var(--forest-500)',
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--stone-600)', marginBottom: 10, fontWeight: 600 }}>
              Not punched in. Pick a job to start the clock.
            </div>
          </div>
        )}

        <div className="section-h">Your Jobs Today</div>
        {todaysJobs.map((j) => (
          <div key={j.id} className="card" style={{ cursor: 'default', padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{j.client}</div>
                <div style={{ fontSize: 13, color: 'var(--stone-600)', marginTop: 2 }}>{j.type}</div>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--stone-500)', fontWeight: 600 }}>{j.date}</span>
            </div>
            {j.notes && (
              <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginTop: 8, padding: '8px 10px', background: 'var(--cream-100)', borderRadius: 10 }}>
                {j.notes}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => punchIn(j.client)}
                disabled={!!punchedInAt}
                className="btn btn-primary"
                style={{ flex: 1, height: 44, fontSize: 14 }}
              >
                <Icon.check width="16" height="16" /> Punch In
              </button>
              <Link
                href={`/worker/log?client=${encodeURIComponent(j.client)}`}
                className="btn btn-secondary"
                style={{ flex: 1, height: 44, fontSize: 14, textDecoration: 'none' }}
              >
                <Icon.receipts width="16" height="16" /> Log Expense
              </Link>
            </div>
          </div>
        ))}

        <div className="section-h" style={{ marginTop: 22 }}>This Week</div>
        <div className="card" style={{ cursor: 'default', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--stone-500)', fontWeight: 600 }}>Hours logged</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--forest-800)', fontVariantNumeric: 'tabular-nums' }}>
                18.5 <span style={{ fontSize: 14, color: 'var(--stone-500)' }}>hrs</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--stone-500)', fontWeight: 600 }}>Materials logged</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cedar-700)', fontVariantNumeric: 'tabular-nums' }}>
                {money(384.22, 0)}
              </div>
            </div>
          </div>
          <Link
            href="/worker/history"
            className="btn btn-secondary btn-block"
            style={{ marginTop: 14, height: 44, fontSize: 14, textDecoration: 'none' }}
          >
            View week breakdown
          </Link>
        </div>
      </div>
    </>
  )
}
