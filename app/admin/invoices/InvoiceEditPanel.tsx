'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/utils'
import type { Client, Invoice, InvoiceLineItem } from '@/lib/data'
import { Badge, TopBar } from '@/components/Shared'
import { LineItemsPanel } from './LineItemsPanel'

const STATUS_OPTIONS: { value: Invoice['status']; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
]
const statusBadge: Record<Invoice['status'], string> = { draft: 'draft', sent: 'sent', paid: 'paid' }

export function InvoiceEditPanel({
  initial,
  clients,
  canEdit,
  salesTaxBps,
  qbConnected,
  onClose,
  onDownloadPDF,
  onSendInvoice,
  onOpenQBSheet,
  onGenerateFromEstimate,
  onGenerateFromJob,
}: {
  initial: Invoice
  clients: Client[]
  canEdit: boolean
  salesTaxBps: number
  qbConnected: boolean
  onClose: () => void
  onDownloadPDF?: (current: Invoice, computed: ComputedTotals) => Promise<void> | void
  onSendInvoice?: (current: Invoice, computed: ComputedTotals) => Promise<void> | void
  onOpenQBSheet?: () => void
  onGenerateFromEstimate?: () => void
  onGenerateFromJob?: () => void
}) {
  const router = useRouter()
  const [inv, setInv] = useState<Invoice>(initial)
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [subtotal, setSubtotal] = useState<number>(() =>
    (initial.lineItems ?? []).reduce((s, m) => s + m.qty * m.price, 0),
  )

  const taxRate = salesTaxBps / 10000
  const tax = inv.applyTax ? subtotal * taxRate : 0
  const total = subtotal + tax
  const computedTotals: ComputedTotals = { subtotal, tax, total, taxRate }

  // Sync DB total whenever subtotal/tax change so the list view shows the right number.
  useEffect(() => {
    if (!canEdit) return
    if (Math.abs((inv.total ?? 0) - total) < 0.005) return
    const supabase = createClient()
    supabase
      .from('invoices')
      .update({ total_cents: Math.round(total * 100) })
      .eq('id', inv.id)
      .then(() => undefined)
    setInv((p) => ({ ...p, total }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, tax])

  function patch(p: Partial<Invoice>) {
    setInv((prev) => ({ ...prev, ...p }))
  }

  async function persist(payload: Record<string, unknown>) {
    if (!canEdit) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('invoices').update(payload).eq('id', inv.id)
    setBusy(false)
    if (error) setError(error.message)
    else startTransition(() => router.refresh())
  }

  async function deleteInvoice() {
    if (!canEdit) return
    if (!confirm('Delete this invoice?')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('invoices').delete().eq('id', inv.id)
    setBusy(false)
    if (error) setError(error.message)
    else {
      onClose()
      router.refresh()
    }
  }

  return (
    <>
      <TopBar
        title="Invoice"
        sub={`#INV-${inv.id.slice(0, 8).toUpperCase()}`}
        onBack={onClose}
        right={
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setStatusOpen((s) => !s)}
              disabled={!canEdit}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
              aria-label="Change status"
            >
              <Badge status={statusBadge[inv.status]}>{inv.statusLabel} {canEdit ? '▾' : ''}</Badge>
            </button>
            {statusOpen && (
              <>
                <div onClick={() => setStatusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 31,
                    background: '#fff',
                    border: '1px solid var(--cream-200)',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(18,39,27,0.12)',
                    padding: 6,
                    minWidth: 160,
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={async () => {
                        setStatusOpen(false)
                        if (opt.value === inv.status) return
                        patch({ status: opt.value, statusLabel: opt.label })
                        await persist({ status: opt.value })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        background: opt.value === inv.status ? 'var(--cream-100)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        borderRadius: 8,
                      }}
                    >
                      <Badge status={statusBadge[opt.value]}>{opt.label}</Badge>
                      {opt.value === inv.status && <Icon.check width="16" height="16" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      />
      <div className="screen-body">
        {error && (
          <div className="banner err" style={{ marginBottom: 10 }}>
            <div>{error}</div>
          </div>
        )}

        {inv.fromEstimate && (
          <div className="banner ok" style={{ marginBottom: 14 }}>
            <Icon.check width="18" height="18" />
            <div>
              <div className="b-title">Linked to Estimate #{inv.fromEstimate.slice(0, 8).toUpperCase()}</div>
              Line items were copied from the estimate; edit freely below.
            </div>
          </div>
        )}
        {inv.fromJob && (
          <div className="banner ok" style={{ marginBottom: 14 }}>
            <Icon.check width="18" height="18" />
            <div>
              <div className="b-title">Linked to Job #{inv.fromJob.slice(0, 8).toUpperCase()}</div>
              Labor and material costs were pulled from this job. Lines are editable.
            </div>
          </div>
        )}

        {canEdit && (inv.lineItems ?? []).length === 0 && (onGenerateFromEstimate || onGenerateFromJob) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {onGenerateFromEstimate && (
              <button
                onClick={onGenerateFromEstimate}
                style={generateBtnStyle}
              >
                <Icon.leaf width="16" height="16" w={2.2} /> From Estimate
              </button>
            )}
            {onGenerateFromJob && (
              <button onClick={onGenerateFromJob} style={generateBtnStyle}>
                <Icon.jobs width="16" height="16" w={2.2} /> From Completed Job
              </button>
            )}
          </div>
        )}

        <div className="field">
          <label>
            Client
            {(inv.fromEstimate || inv.fromJob) && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--stone-500)', fontWeight: 500 }}>
                (from linked {inv.fromJob ? 'job' : 'estimate'} — locked)
              </span>
            )}
          </label>
          <select
            value={inv.clientId ?? ''}
            disabled={!canEdit || busy || !!inv.fromEstimate || !!inv.fromJob}
            onChange={(e) => {
              const newClientId = e.target.value
              const c = clients.find((x) => x.id === newClientId)
              patch({ clientId: newClientId, client: c?.name ?? '' })
              persist({ client_id: newClientId })
            }}
            style={{ ...selectStyle, opacity: inv.fromEstimate || inv.fromJob ? 0.7 : 1 }}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Job Reference</label>
          <input
            value={inv.job}
            disabled={!canEdit || busy}
            onChange={(e) => patch({ job: e.target.value })}
            onBlur={(e) => persist({ job_reference: e.target.value })}
            placeholder="e.g. April — Weekly Cuts"
            style={inputStyle}
          />
        </div>

        <div className="field">
          <label>Due Label</label>
          <input
            value={inv.due ?? ''}
            disabled={!canEdit || busy}
            onChange={(e) => patch({ due: e.target.value })}
            onBlur={(e) => persist({ due_label: e.target.value || null })}
            placeholder="e.g. Due May 5"
            style={inputStyle}
          />
        </div>

        <LineItemsPanel
          key={inv.id}
          invoiceId={inv.id}
          initial={inv.lineItems ?? []}
          canEdit={canEdit}
          onTotalChange={setSubtotal}
        />

        {salesTaxBps > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              padding: '12px 14px',
              background: '#fff',
              border: '1px solid var(--cream-200)',
              borderRadius: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Apply sales tax</div>
              <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 2 }}>
                {(taxRate * 100).toFixed(3)}% on subtotal
              </div>
            </div>
            <ToggleSwitch
              on={!!inv.applyTax}
              disabled={!canEdit}
              onChange={(v) => {
                patch({ applyTax: v })
                persist({ apply_tax: v })
              }}
            />
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            padding: 16,
            background: 'var(--forest-800)',
            color: 'var(--cream-50)',
            borderRadius: 16,
          }}
        >
          <Row label="Subtotal" value={money(subtotal)} dim />
          {inv.applyTax && salesTaxBps > 0 && (
            <Row label={`Tax (${(taxRate * 100).toFixed(3)}%)`} value={money(tax)} dim />
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', margin: '10px 0 8px' }} />
          <Row
            label="TOTAL DUE"
            value={money(total)}
            big
          />
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Internal Notes</label>
          <textarea
            value={inv.notes ?? ''}
            disabled={!canEdit || busy}
            onChange={(e) => setInv((p) => ({ ...p, notes: e.target.value }))}
            onBlur={(e) => persist({ notes: e.target.value || null })}
            rows={3}
            placeholder="Notes for yourself (not shown on the invoice)"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={!onDownloadPDF}
            onClick={onDownloadPDF ? () => onDownloadPDF(inv, computedTotals) : undefined}
          >
            <Icon.download width="18" height="18" /> PDF
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            disabled={!qbConnected || !onSendInvoice}
            onClick={onSendInvoice && qbConnected ? () => onSendInvoice(inv, computedTotals) : undefined}
            title={!qbConnected ? 'Connect QuickBooks first to send invoices' : undefined}
          >
            <Icon.send width="18" height="18" /> Send through QuickBooks
          </button>
        </div>

        {!qbConnected && (
          <button
            type="button"
            onClick={onOpenQBSheet}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              background: '#fbe8c5',
              border: '1px solid #f1d495',
              color: '#5a3e0c',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon.warn width="14" height="14" w={2.2} /> QuickBooks not connected — tap to connect
          </button>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={deleteInvoice}
            disabled={busy}
            style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'transparent',
              color: '#a02020',
              border: '1px solid #f3c4c4',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
            }}
          >
            Delete invoice
          </button>
        )}
      </div>
    </>
  )
}

export type ComputedTotals = {
  subtotal: number
  tax: number
  total: number
  taxRate: number
}

function Row({ label, value, dim, big }: { label: string; value: string; dim?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: big ? 0 : 4,
        color: dim ? '#dfe7df' : '#fff',
      }}
    >
      <span
        style={{
          fontSize: big ? 12 : 11,
          fontWeight: big ? 700 : 500,
          textTransform: big ? 'uppercase' : 'none',
          letterSpacing: big ? '0.05em' : 0,
          opacity: dim ? 0.9 : 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: big ? 26 : 14,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: big ? '-0.02em' : 0,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ToggleSwitch({
  on,
  disabled,
  onChange,
}: {
  on: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        background: on ? 'var(--forest-700)' : 'var(--stone-300)',
        border: 'none',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms',
        flexShrink: 0,
      }}
      aria-pressed={on}
      aria-label="Apply sales tax"
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 120ms',
        }}
      />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--cream-200)',
  background: '#fff',
  fontSize: 15,
  fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const generateBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '14px 16px',
  borderRadius: 14,
  background: 'var(--sage-50)',
  border: '1px dashed var(--forest-500)',
  color: 'var(--forest-800)',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
