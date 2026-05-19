'use client'

import { useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA, estimateTotals, LABOR_RATE, DISPOSAL_RATE, TAX_RATE, type Invoice } from '@/lib/data'
import { money } from '@/lib/utils'
import { Badge, TopBar } from '../Shared'

const statusBadge: Record<Invoice['status'], string> = { draft: 'draft', sent: 'sent', paid: 'paid' }

const qbLabels: Record<Invoice['qbStatus'], { label: string; c: string }> = {
  synced: { label: 'Synced', c: '#2e7d32' },
  'not-synced': { label: 'Not synced', c: '#78756a' },
  failed: { label: 'Sync failed', c: '#8a2d1b' },
}

export function InvoicesScreen({
  qbConnected,
  onOpenInvoice,
  onNew,
  onOpenQB,
}: {
  qbConnected: boolean
  onOpenInvoice: (inv: Invoice) => void
  onNew: () => void
  onOpenQB: () => void
}) {
  const invs = DATA.invoices
  return (
    <>
      <TopBar
        title="Invoices"
        sub={`${invs.length} this month · ${invs.filter((i) => i.status === 'paid').length} paid`}
      />
      <div className="screen-body">
        <button
          onClick={onOpenQB}
          style={{
            width: '100%',
            textAlign: 'left',
            background: qbConnected ? '#e4f0de' : '#fbe8c5',
            border: '1px solid ' + (qbConnected ? '#b8d4b2' : '#f1d495'),
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: qbConnected ? '#2e7d32' : '#b87309',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '-0.02em',
            }}
          >
            qb
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: qbConnected ? '#2c5530' : '#5a3e0c',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: qbConnected ? '#2e7d32' : '#c99400' }}
              />
              {qbConnected ? 'Connected to QuickBooks' : 'Not Connected'}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: qbConnected ? '#2c5530' : '#7a5512',
                marginTop: 2,
                opacity: 0.8,
              }}
            >
              {qbConnected ? 'Last synced 12 min ago · 4 invoices synced' : 'Tap to reconnect — 3 invoices pending'}
            </div>
          </div>
          <Icon.chev width="16" height="16" style={{ color: qbConnected ? '#2c5530' : '#7a5512' }} />
        </button>

        <button className="new-btn" onClick={onNew}>
          <Icon.plus width="18" height="18" /> New Invoice
        </button>

        {invs.map((inv) => {
          const qb = qbLabels[inv.qbStatus]
          return (
            <button key={inv.id} className="card" onClick={() => onOpenInvoice(inv)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{inv.client}</div>
                  <div style={{ fontSize: 13, color: 'var(--stone-600)' }}>{inv.job}</div>
                </div>
                <Badge status={statusBadge[inv.status]}>{inv.statusLabel}</Badge>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingTop: 10,
                  borderTop: '1px solid var(--cream-200)',
                }}
              >
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: qb.c, fontWeight: 600 }}>
                  {inv.qbStatus === 'synced' && <Icon.check width="12" height="12" />}
                  {inv.qbStatus === 'failed' && <Icon.warn width="12" height="12" />}
                  {inv.qbStatus === 'not-synced' && (
                    <span
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }}
                    />
                  )}
                  {qb.label}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--forest-800)',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {money(inv.total ?? 0, 0)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--stone-500)', marginTop: 1 }}>{inv.due}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

export function QBSheet({
  connected,
  onClose,
  onToggle,
}: {
  connected: boolean
  onClose: () => void
  onToggle: () => void
}) {
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '55%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>QuickBooks Sync</h2>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sheet-body">
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: connected ? '#2e7d32' : '#b87309',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                marginBottom: 12,
              }}
            >
              qb
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest-800)' }}>
              {connected ? 'Connected' : 'Not Connected'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--stone-600)', marginTop: 4 }}>
              {connected ? 'Cedar Fields Landscaping INC' : 'Reconnect to resume syncing'}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--cream-200)', borderRadius: 14, padding: '4px 14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--cream-200)',
              }}
            >
              <span style={{ color: 'var(--stone-600)', fontSize: 14 }}>Last synced</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{connected ? '12 min ago' : 'Apr 14, 9:02 AM'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--cream-200)',
              }}
            >
              <span style={{ color: 'var(--stone-600)', fontSize: 14 }}>Invoices synced</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{connected ? '4 of 4' : '3 pending'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ color: 'var(--stone-600)', fontSize: 14 }}>Company file</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>CFL-2026.qbw</span>
            </div>
          </div>
        </div>
        <div className="sheet-foot">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onToggle}>
            {connected ? 'Disconnect' : 'Reconnect'}
          </button>
          <button className="btn btn-primary" style={{ flex: 1.2 }} disabled={!connected}>
            <Icon.sync width="18" height="18" /> Sync Now
          </button>
        </div>
      </div>
    </>
  )
}

export function InvoiceDetail({ invoice: initial, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [inv, setInv] = useState<Invoice>(initial)
  const [showConvert, setShowConvert] = useState(false)
  const [taxOn, setTaxOn] = useState(false)

  const linkedEst = inv.fromEstimate ? DATA.estimates.find((e) => e.id === inv.fromEstimate) : null
  const src = linkedEst || inv
  const labor = (src.laborHrs || 0) * LABOR_RATE
  const disposal = (src.disposal || 0) * DISPOSAL_RATE
  const materials = (src.materials || []).reduce((s, m) => s + (m.tbd ? 0 : m.qty * m.price), 0)
  const subtotal = labor + disposal + materials
  const tax = taxOn ? subtotal * TAX_RATE : 0
  const total = inv.total ?? subtotal + tax

  const convertFrom = (estId: string) => {
    const est = DATA.estimates.find((e) => e.id === estId)
    if (!est) return
    setInv((p) => ({
      ...p,
      client: est.client,
      clientId: est.clientId,
      job: est.job,
      fromEstimate: est.id,
      laborHrs: est.laborHrs,
      yardage: est.yardage,
      disposal: est.disposal,
      materials: est.materials,
      total: null,
    }))
    setShowConvert(false)
  }

  const qbInfo: Record<Invoice['qbStatus'], { label: string; c: string; bg: string }> = {
    synced: { label: 'Synced to QuickBooks', c: '#2e7d32', bg: '#e4f0de' },
    'not-synced': { label: 'Not synced to QuickBooks', c: '#78756a', bg: 'var(--cream-100)' },
    failed: { label: 'Sync failed — tap to retry', c: '#8a2d1b', bg: '#f6d6cf' },
  }
  const info = qbInfo[inv.qbStatus || 'not-synced']

  return (
    <>
      <TopBar
        title="Invoice"
        sub={`#INV-${(inv.id || '').toUpperCase()}`}
        onBack={onClose}
        right={<Badge status={statusBadge[inv.status]}>{inv.statusLabel}</Badge>}
      />
      <div className="screen-body">
        {!inv.fromEstimate && (
          <button
            onClick={() => setShowConvert(true)}
            style={{
              width: '100%',
              background: 'var(--sage-50)',
              border: '1px dashed var(--forest-500)',
              borderRadius: 14,
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              marginBottom: 14,
              fontFamily: 'inherit',
              color: 'var(--forest-800)',
            }}
          >
            <Icon.leaf width="22" height="22" />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Convert from Estimate</div>
              <div style={{ fontSize: 11.5, color: 'var(--stone-600)', marginTop: 2 }}>
                Auto-populate line items from an approved estimate
              </div>
            </div>
            <Icon.chev width="16" height="16" />
          </button>
        )}
        {inv.fromEstimate && (
          <div className="banner ok">
            <Icon.check width="18" height="18" />
            <div>
              <div className="b-title">Converted from Estimate #{inv.fromEstimate.toUpperCase()}</div>
              Line items pulled from estimate. Editable below.
            </div>
          </div>
        )}

        <div className="field">
          <label>Client</label>
          <input
            defaultValue={inv.client}
            readOnly={!!inv.fromEstimate}
            style={inv.fromEstimate ? { background: 'var(--cream-100)' } : {}}
          />
        </div>
        <div className="field">
          <label>Job Reference</label>
          <input defaultValue={inv.job} />
        </div>

        <div className="section-h">Line Items</div>
        <div className="card" style={{ cursor: 'default', padding: '4px 16px' }}>
          <div className="line-item">
            <div style={{ flex: 1 }}>
              <div className="name">Labor</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--stone-500)',
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {src.laborHrs || 0} hrs × $45.00/hr
              </div>
            </div>
            <div className="amt">{money(labor)}</div>
          </div>
          {(src.materials || []).length > 0 && (
            <div className="line-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="name">Materials</div>
                <div className="amt">{money(materials)}</div>
              </div>
              <div style={{ paddingLeft: 2, marginTop: 2 }}>
                {src.materials!.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--stone-600)',
                      padding: '3px 0',
                    }}
                  >
                    <span>
                      · {m.name} <span style={{ color: 'var(--stone-400)' }}>×{m.qty}</span>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(m.qty * m.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="line-item">
            <div style={{ flex: 1 }}>
              <div className="name">Disposal</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--stone-500)',
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {src.disposal || 0} yd × $85.00/yd
              </div>
            </div>
            <div className="amt">{money(disposal)}</div>
          </div>
        </div>

        <button
          style={{
            width: '100%',
            marginTop: 10,
            padding: 12,
            background: 'transparent',
            border: '1px dashed var(--stone-300)',
            borderRadius: 12,
            color: 'var(--stone-600)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          + Add charge
        </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
            padding: '12px 14px',
            background: '#fff',
            border: '1px solid var(--cream-200)',
            borderRadius: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Apply sales tax</div>
            <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 2 }}>NY Suffolk County · 8.625%</div>
          </div>
          <button
            onClick={() => setTaxOn(!taxOn)}
            style={{
              width: 46,
              height: 28,
              borderRadius: 14,
              background: taxOn ? 'var(--forest-700)' : 'var(--stone-300)',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            aria-label="Toggle sales tax"
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: taxOn ? 22 : 2,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }}
            />
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '14px 16px',
            background: 'var(--forest-800)',
            borderRadius: 16,
            color: 'var(--cream-50)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, opacity: 0.75 }}>
            <span>Subtotal</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(subtotal)}</span>
          </div>
          {taxOn && (
            <div
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, opacity: 0.75 }}
            >
              <span>Tax (8.625%)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(tax)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: 10,
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>TOTAL</span>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {money(total)}
            </span>
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Notes</label>
          <textarea defaultValue="Thanks for your business. Payment due within 14 days." />
        </div>

        <div
          style={{
            padding: '12px 14px',
            background: info.bg,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {inv.qbStatus === 'synced' ? (
            <Icon.check width="18" height="18" style={{ color: info.c }} />
          ) : inv.qbStatus === 'failed' ? (
            <Icon.warn width="18" height="18" style={{ color: info.c }} />
          ) : (
            <Icon.sync width="18" height="18" style={{ color: info.c }} />
          )}
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: info.c }}>{info.label}</div>
          {inv.qbStatus === 'failed' && (
            <button
              onClick={() => setInv((p) => ({ ...p, qbStatus: 'synced' }))}
              style={{
                background: '#8a2d1b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon.retry width="12" height="12" /> Retry
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }}>
            <Icon.send width="16" height="16" /> Send
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.2 }}
            onClick={() => setInv((p) => ({ ...p, qbStatus: 'synced' }))}
          >
            <Icon.sync width="16" height="16" /> Sync to QB
          </button>
        </div>
      </div>

      {showConvert && (
        <>
          <div className="sheet-back" onClick={() => setShowConvert(false)} />
          <div className="sheet" style={{ maxHeight: '70%' }}>
            <div className="handle" />
            <div className="sheet-head">
              <h2>Convert Estimate</h2>
              <button className="close" onClick={() => setShowConvert(false)}>
                ×
              </button>
            </div>
            <div className="sheet-body">
              <div style={{ fontSize: 13, color: 'var(--stone-600)', marginBottom: 14 }}>
                Pick an approved estimate. Line items and totals will auto-populate.
              </div>
              {DATA.estimates
                .filter((e) => ['ready', 'sent'].includes(e.status))
                .map((e) => (
                  <button key={e.id} className="card" onClick={() => convertFrom(e.id)} style={{ padding: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 6,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{e.client}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginTop: 2 }}>{e.job}</div>
                      </div>
                      <Badge status={e.status}>{e.statusLabel}</Badge>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: 'var(--stone-500)',
                        marginTop: 6,
                      }}
                    >
                      <span>{e.date}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--forest-800)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {money(estimateTotals(e).total, 0)}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
