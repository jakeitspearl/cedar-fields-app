'use client'

import { useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA, type Client, type Estimate } from '@/lib/data'
import { Badge, TopBar } from '../Shared'
import { EstimateCard } from './Estimates'
import type { AnyJob } from './Jobs'

const statusMap: Record<string, string> = {
  scheduled: 'pending',
  'in-progress': 'ready',
  complete: 'paid',
}

export function ClientsScreen({
  onOpenClient,
  clients,
}: {
  onOpenClient: (c: Client) => void
  clients?: Client[]
}) {
  const all = clients ?? DATA.clients
  const [q, setQ] = useState('')
  const list = all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <TopBar title="Clients" sub={`${all.length} active`} />
      <div className="screen-body">
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients"
            style={{
              width: '100%',
              padding: '14px 14px 14px 42px',
              borderRadius: 14,
              border: '1px solid var(--cream-200)',
              fontSize: 15,
              background: '#fff',
              fontFamily: 'inherit',
            }}
          />
          <Icon.search
            width="18"
            height="18"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone-400)' }}
          />
        </div>
        {list.map((c) => (
          <button
            key={c.id}
            className="card"
            onClick={() => onOpenClient(c)}
            style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--sage-100)',
                color: 'var(--forest-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {c.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--stone-500)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.phone}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest-800)' }}>{c.jobs}</div>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--stone-500)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.05,
                  fontWeight: 600,
                }}
              >
                jobs
              </div>
              {c.open > 0 && (
                <div style={{ marginTop: 4, fontSize: 10.5, color: 'var(--cedar-700)', fontWeight: 700 }}>
                  {c.open} open
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

export function ClientDetail({
  client,
  onClose,
  onOpenEstimate,
  onOpenJob,
}: {
  client: Client
  onClose: () => void
  onOpenEstimate: (est: Estimate) => void
  onOpenJob: (job: AnyJob) => void
}) {
  const clientJobs = DATA.oneTimeJobs.filter((j) => j.client === client.name)
  const clientRec = DATA.recurringJobs.filter((j) => j.client === client.name)
  const clientEsts = DATA.estimates.filter((e) => e.clientId === client.id)
  return (
    <>
      <TopBar title="Client" onBack={onClose} />
      <div className="screen-body">
        <div
          style={{
            background: 'linear-gradient(135deg, var(--forest-700), var(--forest-800))',
            borderRadius: 20,
            padding: 20,
            color: 'var(--cream-50)',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {client.initials}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{client.name}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{client.address}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-cedar" style={{ flex: 1, height: 44, fontSize: 14 }}>
              <Icon.phone width="16" height="16" /> Call
            </button>
            <button
              className="btn"
              style={{ flex: 1, height: 44, fontSize: 14, background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <Icon.mail width="16" height="16" /> Email
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#fff', border: '1px solid var(--cream-200)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--forest-800)' }}>{client.jobs}</div>
            <div style={{ fontSize: 10.5, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Jobs
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--cream-200)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cedar-700)' }}>{clientEsts.length}</div>
            <div style={{ fontSize: 10.5, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Estimates
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--cream-200)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--forest-700)' }}>{clientRec.length}</div>
            <div style={{ fontSize: 10.5, color: 'var(--stone-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Recurring
            </div>
          </div>
        </div>

        {clientEsts.length > 0 && (
          <>
            <div className="section-h">Open Estimates</div>
            {clientEsts.map((e) => (
              <EstimateCard key={e.id} est={e} onClick={() => onOpenEstimate(e)} />
            ))}
          </>
        )}

        {clientJobs.length > 0 && (
          <>
            <div className="section-h">Job History</div>
            {clientJobs.map((j) => (
              <button
                key={j.id}
                className="card"
                onClick={() => onOpenJob({ ...j, kind: 'onetime' })}
                style={{ padding: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{j.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--stone-500)', marginTop: 2 }}>{j.date}</div>
                  </div>
                  <Badge status={statusMap[j.status]}>{j.statusLabel}</Badge>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  )
}
