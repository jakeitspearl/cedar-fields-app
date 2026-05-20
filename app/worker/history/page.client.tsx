'use client'

import { useMemo } from 'react'
import { Icon } from '@/lib/icons'
import { TopBar } from '@/components/Shared'

export type HistoryEntry = {
  id: string
  hours: number
  notes: string
  service: string
  clientName: string
  startedAt: string // ISO timestamptz
  jobId: string | null
}

export type ScheduleItem = {
  id: string
  kind: 'onetime' | 'recurring'
  clientName: string
  service: string
  notes: string
  scheduledDate: string | null  // YYYY-MM-DD for one-time
  frequency: string | null      // recurring only
  loggedThisWeek: boolean
}

function fmtDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtMonthDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WorkerHistoryClient({
  entries,
  schedule,
  weekStart,
  weekEnd,
}: {
  entries: HistoryEntry[]
  schedule: ScheduleItem[]
  weekStart: string
  weekEnd: string
}) {
  const total = useMemo(() => entries.reduce((s, e) => s + e.hours, 0), [entries])

  const byDay = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {}
    for (const e of entries) {
      const day = e.startedAt.slice(0, 10)
      ;(groups[day] ??= []).push(e)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  // Schedule items grouped: one-time by day; recurring shown last as a group
  const scheduleByDay = useMemo(() => {
    const oneTime = schedule.filter((s) => s.kind === 'onetime')
    const groups: Record<string, ScheduleItem[]> = {}
    for (const s of oneTime) {
      if (!s.scheduledDate) continue
      ;(groups[s.scheduledDate] ??= []).push(s)
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [schedule])
  const recurring = useMemo(() => schedule.filter((s) => s.kind === 'recurring'), [schedule])

  return (
    <>
      <TopBar title="My Week" sub={`${fmtMonthDay(weekStart)} — ${fmtMonthDay(weekEnd)}`} />
      <div className="screen-body">
        <div
          className="card"
          style={{
            cursor: 'default',
            padding: 18,
            marginBottom: 18,
            background: 'var(--sage-50)',
            border: '1px solid var(--sage-100)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total hours
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: 'var(--forest-800)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              marginTop: 2,
            }}
          >
            {Math.round(total * 100) / 100}
            <span style={{ fontSize: 16, color: 'var(--stone-500)', fontWeight: 500, marginLeft: 4 }}>hrs</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--stone-500)', marginTop: 4 }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} logged
          </div>
        </div>

        <div className="section-h">
          <span>Logged</span>
          <span className="count">{entries.length}</span>
        </div>
        {byDay.length === 0 ? (
          <div className="card" style={{ padding: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 14 }}>
            No hours logged yet this week.
          </div>
        ) : (
          byDay.map(([day, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0)
            return (
              <div key={day} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    margin: '12px 6px 8px',
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--stone-600)' }}>
                    {fmtDay(day + 'T12:00:00')}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--forest-700)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {Math.round(dayTotal * 100) / 100} hrs
                  </span>
                </div>
                {dayEntries.map((e) => (
                  <div key={e.id} className="card" style={{ cursor: 'default', padding: 14, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{e.clientName}</div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--forest-700)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {e.hours} hrs
                      </div>
                    </div>
                    {e.service && (
                      <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginTop: 2 }}>{e.service}</div>
                    )}
                    {e.notes && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--stone-600)',
                          marginTop: 8,
                          padding: '8px 10px',
                          background: 'var(--cream-100)',
                          borderRadius: 10,
                        }}
                      >
                        {e.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })
        )}

        <div className="section-h" style={{ marginTop: 22 }}>
          <span>Schedule</span>
          <span className="count">{schedule.length}</span>
        </div>
        {schedule.length === 0 ? (
          <div className="card" style={{ padding: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 14 }}>
            No jobs scheduled this week.
          </div>
        ) : (
          <>
            {scheduleByDay.map(([day, items]) => (
              <div key={day} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--stone-600)',
                    margin: '12px 6px 8px',
                  }}
                >
                  {fmtDay(day + 'T12:00:00')}
                </div>
                {items.map((s) => (
                  <ScheduleCard key={s.id} item={s} />
                ))}
              </div>
            ))}
            {recurring.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: 'var(--stone-600)',
                    margin: '12px 6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon.repeat width="13" height="13" w={2.2} />
                  Recurring (ongoing)
                </div>
                {recurring.map((s) => (
                  <ScheduleCard key={s.id} item={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function ScheduleCard({ item }: { item: ScheduleItem }) {
  return (
    <div className="card" style={{ cursor: 'default', padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.clientName}</div>
          <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginTop: 2 }}>{item.service}</div>
          {item.kind === 'recurring' && item.frequency && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--forest-700)',
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
              }}
            >
              <Icon.repeat width="12" height="12" w={2.2} /> {item.frequency}
            </div>
          )}
        </div>
        {item.loggedThisWeek && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--status-paid-fg)',
              background: 'var(--status-paid-bg)',
              padding: '4px 10px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            <Icon.check width="12" height="12" w={2.4} /> Logged
          </span>
        )}
      </div>
      {item.notes && (
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--stone-600)',
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--cream-100)',
            borderRadius: 10,
          }}
        >
          {item.notes}
        </div>
      )}
    </div>
  )
}
