'use client'

import { useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA, type OneTimeJob, type RecurringJob } from '@/lib/data'
import { money } from '@/lib/utils'
import { Badge, TopBar } from '../Shared'

type AnyJob = (OneTimeJob & { kind: 'onetime' }) | (RecurringJob & { kind: 'recurring' })

const statusMap: Record<string, string> = {
  scheduled: 'pending',
  'in-progress': 'ready',
  complete: 'paid',
}

export function JobsScreen({ onOpenJob }: { onOpenJob: (job: AnyJob) => void }) {
  const [tab, setTab] = useState<'recurring' | 'onetime'>('recurring')
  const recurring = DATA.recurringJobs
  const oneTime = DATA.oneTimeJobs

  return (
    <>
      <TopBar title="Jobs" sub={`${recurring.length} recurring · ${oneTime.length} one-time`} />
      <div className="screen-body">
        <button className="new-btn">
          <Icon.plus width="18" height="18" /> New Job
        </button>
        <div className="segment">
          <button className={tab === 'recurring' ? 'on' : ''} onClick={() => setTab('recurring')}>
            Recurring · {recurring.length}
          </button>
          <button className={tab === 'onetime' ? 'on' : ''} onClick={() => setTab('onetime')}>
            One-Time · {oneTime.length}
          </button>
        </div>

        {tab === 'recurring' &&
          recurring.map((j) => (
            <button key={j.id} className="card" onClick={() => onOpenJob({ ...j, kind: 'recurring' })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{j.client}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--stone-600)' }}>{j.service}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--forest-700)',
                    }}
                  >
                    <Icon.repeat width="14" height="14" w={2} />
                    <span style={{ fontWeight: 600 }}>{j.frequency}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--forest-800)',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {money(j.price, 0)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--stone-500)', marginTop: 2 }}>per visit</div>
                  <div style={{ fontSize: 11, color: 'var(--cedar-700)', marginTop: 6, fontWeight: 600 }}>
                    Next · {j.next}
                  </div>
                </div>
              </div>
            </button>
          ))}

        {tab === 'onetime' &&
          oneTime.map((j) => (
            <button key={j.id} className="card" onClick={() => onOpenJob({ ...j, kind: 'onetime' })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{j.client}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--stone-600)' }}>{j.type}</div>
                </div>
                <Badge status={statusMap[j.status]}>{j.statusLabel}</Badge>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--cream-200)',
                  paddingTop: 10,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--stone-600)' }}>
                  {j.workers.map((w, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: i === 0 ? 'var(--forest-700)' : 'var(--cedar-600)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {w[0]}
                      </span>
                      <span>{w}</span>
                      {i < j.workers.length - 1 && (
                        <span style={{ margin: '0 4px', color: 'var(--stone-300)' }}>·</span>
                      )}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--forest-800)',
                  }}
                >
                  {money(j.price, 0)}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 6 }}>{j.date}</div>
            </button>
          ))}
      </div>
    </>
  )
}

export function JobDetail({ job, onClose }: { job: AnyJob; onClose: () => void }) {
  return (
    <>
      <TopBar title="Job" sub={job.kind === 'onetime' ? job.type : job.service} onBack={onClose} />
      <div className="screen-body">
        <div
          className="card"
          style={{
            cursor: 'default',
            padding: 18,
            background: 'var(--forest-800)',
            color: 'var(--cream-50)',
            border: 'none',
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Client
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: '-0.01em' }}>{job.client}</div>
          <div style={{ fontSize: 14, marginTop: 4, opacity: 0.8 }}>
            {job.kind === 'onetime' ? job.type : job.service}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div>
              <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 600 }}>PRICE</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                {money(job.price, 0)}
              </div>
            </div>
            {job.kind === 'onetime' && (
              <Badge status={statusMap[job.status] || 'ready'}>{job.statusLabel}</Badge>
            )}
            {job.kind === 'recurring' && (
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ opacity: 0.7 }}>Frequency</div>
                <div style={{ fontWeight: 600 }}>{job.frequency}</div>
              </div>
            )}
          </div>
        </div>

        {job.kind === 'onetime' && (
          <>
            <div className="section-h">Workers Assigned</div>
            <div className="card" style={{ cursor: 'default', padding: 14, display: 'flex', gap: 10 }}>
              {job.workers.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--cream-100)',
                    padding: '8px 12px 8px 8px',
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: i === 0 ? 'var(--forest-700)' : 'var(--cedar-600)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {w[0]}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{w}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {(job.kind === 'onetime' ? job.date : job.next) && (
          <>
            <div className="section-h">{job.kind === 'onetime' ? 'Scheduled' : 'Next Visit'}</div>
            <div
              className="card"
              style={{ cursor: 'default', padding: 14, fontSize: 15, fontWeight: 600, color: 'var(--forest-800)' }}
            >
              {job.kind === 'onetime' ? job.date : job.next}
            </div>
          </>
        )}

        {job.kind === 'onetime' && job.notes && (
          <>
            <div className="section-h">Notes</div>
            <div
              className="card"
              style={{ cursor: 'default', padding: 14, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-900)' }}
            >
              {job.notes}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export type { AnyJob }
