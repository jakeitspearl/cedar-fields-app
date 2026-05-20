'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { money } from '@/lib/utils'
import { NumberInput } from '@/components/NumberInput'
import {
  loadJobInvoiceContext,
  generateLinesFromJob,
  type JobInvoiceContext,
} from './generateFromJob'
import type { JobRef } from './page.client'

export function GenerateFromJobSheet({
  invoiceId,
  jobs,
  onClose,
}: {
  invoiceId: string
  jobs: JobRef[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id ?? '')
  const [ctx, setCtx] = useState<JobInvoiceContext | null>(null)
  const [ctxLoading, setCtxLoading] = useState(false)
  const [ctxError, setCtxError] = useState<string | null>(null)

  const [laborHours, setLaborHours] = useState<number>(0)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set())
  const [markupPct, setMarkupPct] = useState<number>(30)
  const [includeDisposal, setIncludeDisposal] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load context whenever job changes
  useEffect(() => {
    if (!selectedJobId) {
      setCtx(null)
      return
    }
    let alive = true
    setCtxLoading(true)
    setCtxError(null)
    loadJobInvoiceContext(selectedJobId).then((res) => {
      if (!alive) return
      setCtxLoading(false)
      if (res.ok) {
        setCtx(res.data)
        setLaborHours(res.data.laborHours)
        setSelectedReceiptIds(new Set(res.data.receipts.map((r) => r.id)))
        setIncludeDisposal(res.data.disposalYards > 0)
      } else {
        setCtxError(res.error)
      }
    })
    return () => {
      alive = false
    }
  }, [selectedJobId])

  const totalCostCents = useMemo(() => {
    if (!ctx) return 0
    return ctx.receipts
      .filter((r) => selectedReceiptIds.has(r.id))
      .reduce((s, r) => s + r.amountCents, 0)
  }, [ctx, selectedReceiptIds])

  const materialsCharge = totalCostCents * (1 + markupPct / 100) / 100
  const laborCharge = laborHours * ((ctx?.laborRateCents ?? 4500) / 100)
  const disposalCharge =
    includeDisposal && ctx?.disposalYards ? ctx.disposalYards * (ctx.disposalRateCents / 100) : 0
  const previewTotal = laborCharge + materialsCharge + disposalCharge

  function toggleReceipt(id: string) {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function go() {
    if (!ctx) return
    setSubmitError(null)
    setSubmitting(true)
    const res = await generateLinesFromJob({
      invoiceId,
      jobId: selectedJobId,
      laborHours,
      receiptIds: Array.from(selectedReceiptIds),
      materialsMarkupBps: Math.round(markupPct * 100),
      includeDisposal,
    })
    setSubmitting(false)
    if (res.ok) {
      onClose()
      router.refresh()
    } else {
      setSubmitError(res.error)
    }
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '94%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>From Completed Job</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div className="field">
            <label>Job</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={selectStyle}
            >
              {jobs.length === 0 && <option value="">No completed jobs yet</option>}
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.clientName} — {j.service}
                  {j.scheduledDate ? ` (${j.scheduledDate})` : ''}
                  {j.status === 'in_progress' ? ' • in progress' : ''}
                </option>
              ))}
            </select>
          </div>

          {ctxLoading && (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 13 }}>
              Loading…
            </div>
          )}
          {ctxError && (
            <div className="banner err" style={{ marginTop: 8 }}>
              <div>{ctxError}</div>
            </div>
          )}

          {ctx && (
            <>
              {/* Labor */}
              <div className="section-h">
                <span>Labor</span>
                <span className="count">{ctx.laborHours} hrs from time entries</span>
              </div>
              <div className="card" style={{ padding: 14, cursor: 'default' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={miniLabel}>HOURS</div>
                    <NumberInput value={laborHours} onChange={setLaborHours} style={inputStyle} />
                  </div>
                  <div>
                    <div style={miniLabel}>RATE</div>
                    <div style={{ ...inputStyle, background: 'var(--cream-100)', color: 'var(--stone-600)' }}>
                      {money(ctx.laborRateCents / 100)}/hr
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--forest-800)' }}>
                  Labor: {money(laborCharge)}
                </div>
              </div>

              {/* Materials */}
              <div className="section-h" style={{ marginTop: 16 }}>
                <span>Materials (from receipts)</span>
                <span className="count">{ctx.receipts.length}</span>
              </div>
              <div className="card" style={{ padding: 14, cursor: 'default' }}>
                {ctx.receipts.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--stone-500)', textAlign: 'center', padding: '8px 0' }}>
                    No receipts found for this client in the job&apos;s date window.
                  </div>
                ) : (
                  ctx.receipts.map((r) => {
                    const on = selectedReceiptIds.has(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleReceipt(r.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 0',
                          borderTop: '1px solid var(--cream-100)',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: '1.5px solid ' + (on ? 'var(--forest-700)' : 'var(--stone-300)'),
                              background: on ? 'var(--forest-700)' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {on && <Icon.check width="12" height="12" w={3} style={{ color: '#fff' }} />}
                          </div>
                          <div style={{ minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.vendor}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--stone-500)' }}>
                              {r.occurredOn} · {r.category}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cedar-700)', fontVariantNumeric: 'tabular-nums' }}>
                          {money(r.amountCents / 100)}
                        </span>
                      </button>
                    )
                  })
                )}

                {ctx.receipts.length > 0 && (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--cream-200)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        alignItems: 'end',
                      }}
                    >
                      <div>
                        <div style={miniLabel}>COST BASIS</div>
                        <div
                          style={{
                            ...inputStyle,
                            background: 'var(--cream-100)',
                            color: 'var(--cedar-700)',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {money(totalCostCents / 100)}
                        </div>
                      </div>
                      <div>
                        <div style={miniLabel}>MARKUP %</div>
                        <NumberInput value={markupPct} onChange={setMarkupPct} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10, textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--forest-800)' }}>
                      Materials charge: {money(materialsCharge)}{' '}
                      <span style={{ color: 'var(--stone-500)', fontWeight: 500, fontSize: 12 }}>
                        (margin {money(materialsCharge - totalCostCents / 100)})
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Disposal */}
              {ctx.disposalYards > 0 && (
                <>
                  <div className="section-h" style={{ marginTop: 16 }}>
                    <span>Disposal</span>
                    <span className="count">from linked estimate</span>
                  </div>
                  <div className="card" style={{ padding: 14, cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
                        <input
                          type="checkbox"
                          checked={includeDisposal}
                          onChange={(e) => setIncludeDisposal(e.target.checked)}
                          style={{ width: 18, height: 18 }}
                        />
                        Include {ctx.disposalYards} yd × {money(ctx.disposalRateCents / 100)}/yd
                      </label>
                      <span style={{ fontWeight: 700, color: 'var(--forest-800)' }}>{money(disposalCharge)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Preview total */}
              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  background: 'var(--forest-800)',
                  color: '#fff',
                  borderRadius: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                    Invoice total (preview)
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {money(previewTotal)}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 6 }}>
                  Lines will be editable on the invoice afterwards.
                </div>
              </div>

              {submitError && (
                <div className="banner err" style={{ marginTop: 14 }}>
                  <div>{submitError}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            onClick={go}
            disabled={submitting || !ctx}
          >
            <Icon.check width="16" height="16" /> {submitting ? 'Generating…' : 'Generate line items'}
          </button>
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--cream-200)',
  background: '#fff',
  fontSize: 15,
  fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const miniLabel: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '0.06em',
  fontWeight: 700,
  color: 'var(--stone-500)',
  marginBottom: 4,
  textTransform: 'uppercase',
}
