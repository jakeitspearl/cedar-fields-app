'use client'

import { useMemo, useState } from 'react'
import { Calendar, dayjsLocalizer, type View, Views } from 'react-big-calendar'
import dayjs from 'dayjs'
import type { OneTimeJob, RecurringJob } from '@/lib/data'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dayjsLocalizer(dayjs)

type JobEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    jobId: string
    kind: 'onetime' | 'recurring'
    clientName: string
    workers: string[]
    status?: string
  }
}

function eventColor(kind: 'onetime' | 'recurring', status?: string): string {
  if (kind === 'recurring') return '#3a6a49' // forest-500
  if (status === 'complete') return '#78756a' // stone-500
  if (status === 'in_progress') return '#9a5a2b' // cedar-600
  return '#1b3a27' // forest-800
}

export function JobsCalendar({
  recurring,
  oneTime,
  onSelectJob,
}: {
  recurring: RecurringJob[]
  oneTime: OneTimeJob[]
  onSelectJob: (jobId: string, kind: 'onetime' | 'recurring') => void
}) {
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState<Date>(new Date())

  const events = useMemo<JobEvent[]>(() => {
    const out: JobEvent[] = []

    // One-time jobs: one event on scheduled_date
    for (const j of oneTime) {
      if (!j.scheduledDate) continue
      const start = dayjs(j.scheduledDate + 'T08:00:00').toDate()
      const end = dayjs(j.scheduledDate + 'T17:00:00').toDate()
      out.push({
        id: j.id,
        title: `${j.client} — ${j.type}`,
        start,
        end,
        resource: {
          jobId: j.id,
          kind: 'onetime',
          clientName: j.client,
          workers: j.workers,
          status: j.status,
        },
      })
    }

    // Recurring jobs: one event on next_date (next scheduled visit)
    for (const j of recurring) {
      if (!j.nextDate) continue
      const start = dayjs(j.nextDate + 'T08:00:00').toDate()
      const end = dayjs(j.nextDate + 'T17:00:00').toDate()
      out.push({
        id: j.id,
        title: `${j.client} — ${j.service} (recurring)`,
        start,
        end,
        resource: {
          jobId: j.id,
          kind: 'recurring',
          clientName: j.client,
          workers: j.workers ?? [],
        },
      })
    }
    return out
  }, [recurring, oneTime])

  return (
    <div style={{ marginTop: 24 }}>
      <div className="section-h">
        <span>Schedule</span>
        <span className="count">{events.length}</span>
      </div>
      <div
        className="card"
        style={{
          cursor: 'default',
          padding: 14,
          height: view === Views.MONTH ? 640 : 700,
        }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={(event) => {
            const ev = event as JobEvent
            const bg = eventColor(ev.resource.kind, ev.resource.status)
            return {
              style: {
                backgroundColor: bg,
                border: 'none',
                color: '#fff',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 6,
              },
            }
          }}
          onSelectEvent={(event) => {
            const ev = event as JobEvent
            onSelectJob(ev.resource.jobId, ev.resource.kind)
          }}
          tooltipAccessor={(event) => {
            const ev = event as JobEvent
            const workers = ev.resource.workers.length > 0
              ? ` — ${ev.resource.workers.join(', ')}`
              : ''
            return `${ev.title}${workers}`
          }}
        />
      </div>
    </div>
  )
}
