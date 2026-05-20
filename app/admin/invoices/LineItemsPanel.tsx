'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/utils'
import { Icon } from '@/lib/icons'
import { NumberInput } from '@/components/NumberInput'
import type { InvoiceLineItem } from '@/lib/data'

type Row = InvoiceLineItem & { _localKey: string; _saving?: boolean; _error?: string }

let _seq = 0
const newKey = () => `__new_inv_${++_seq}`

function dbPatch(row: Row, idx: number) {
  return {
    position: idx,
    name: row.name,
    qty: Number.isFinite(row.qty) ? row.qty : 0,
    unit_price_cents: Math.round((Number.isFinite(row.price) ? row.price : 0) * 100),
    kind: row.kind,
    cost_cents: row.costCents ?? null,
    markup_bps: row.markupBps ?? null,
  }
}

export function LineItemsPanel({
  invoiceId,
  initial,
  canEdit,
  onTotalChange,
}: {
  invoiceId: string
  initial: InvoiceLineItem[]
  canEdit: boolean
  onTotalChange?: (subtotal: number) => void
}) {
  const [items, setItems] = useState<Row[]>(() =>
    initial.map((m) => ({ ...m, _localKey: m.id ?? newKey() })),
  )
  const focusRefByKey = useRef<Record<string, HTMLInputElement | null>>({})

  const subtotal = items.reduce(
    (s, m) => s + (Number.isFinite(m.qty) ? m.qty : 0) * (Number.isFinite(m.price) ? m.price : 0),
    0,
  )

  // Lift subtotal so parent can compute tax + total
  useNotifyOnChange(subtotal, onTotalChange)

  function patch(localKey: string, p: Partial<Row>) {
    setItems((prev) => prev.map((r) => (r._localKey === localKey ? { ...r, ...p } : r)))
  }

  async function persistRow(localKey: string) {
    if (!canEdit) return
    const row = items.find((r) => r._localKey === localKey)
    if (!row) return
    const idx = items.findIndex((r) => r._localKey === localKey)
    if (!row.name.trim() && !row.id) return // skip empty draft

    patch(localKey, { _saving: true, _error: undefined })
    const supabase = createClient()
    if (!row.id) {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .insert({ invoice_id: invoiceId, ...dbPatch(row, idx) })
        .select('id')
        .single()
      if (error || !data) {
        patch(localKey, { _saving: false, _error: error?.message ?? 'Save failed' })
        return
      }
      patch(localKey, { id: data.id, _saving: false })
    } else {
      const { error } = await supabase
        .from('invoice_line_items')
        .update(dbPatch(row, idx))
        .eq('id', row.id)
      patch(localKey, { _saving: false, _error: error?.message })
    }
  }

  async function removeRow(localKey: string) {
    if (!canEdit) return
    const row = items.find((r) => r._localKey === localKey)
    if (!row) return
    if (row.id) {
      const supabase = createClient()
      const { error } = await supabase.from('invoice_line_items').delete().eq('id', row.id)
      if (error) {
        patch(localKey, { _error: error.message })
        return
      }
    }
    setItems((prev) => prev.filter((r) => r._localKey !== localKey))
  }

  function addRow(seed?: Partial<InvoiceLineItem>) {
    const key = newKey()
    setItems((prev) => [
      ...prev,
      {
        _localKey: key,
        name: seed?.name ?? '',
        qty: seed?.qty ?? 1,
        price: seed?.price ?? 0,
        kind: seed?.kind ?? 'custom',
      },
    ])
    requestAnimationFrame(() => focusRefByKey.current[key]?.focus())
  }

  return (
    <>
      <div className="section-h" style={{ marginTop: 18 }}>
        <span>Line Items</span>
        {canEdit && (
          <button
            onClick={() => addRow()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--forest-700)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            + Add line
          </button>
        )}
      </div>

      <div className="card" style={{ cursor: 'default', padding: '4px 14px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '14px 0', fontSize: 13, color: 'var(--stone-500)', textAlign: 'center' }}>
            No line items yet. Tap <strong>+ Add line</strong> or use <strong>Generate from Estimate / Job</strong> above.
          </div>
        ) : (
          items.map((m) => {
            const lineTotal = (m.qty || 0) * (m.price || 0)
            const isMaterial = m.kind === 'material'
            const cost = m.costCents !== undefined ? m.costCents / 100 : null
            return (
              <div
                key={m._localKey}
                className="line-item"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      ref={(el) => {
                        focusRefByKey.current[m._localKey] = el
                      }}
                      value={m.name}
                      onChange={(e) => patch(m._localKey, { name: e.target.value })}
                      onBlur={() => persistRow(m._localKey)}
                      placeholder="Line description"
                      disabled={!canEdit}
                      style={inputStyle}
                    />
                    <KindLabel kind={m.kind} />
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeRow(m._localKey)}
                      style={iconBtn}
                      title="Delete line"
                      aria-label="Delete line"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <div style={miniLabel}>QTY</div>
                    <NumberInput
                      value={m.qty}
                      onChange={(n) => patch(m._localKey, { qty: n })}
                      onBlur={() => persistRow(m._localKey)}
                      disabled={!canEdit}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={miniLabel}>UNIT PRICE</div>
                    <NumberInput
                      value={m.price}
                      onChange={(n) => patch(m._localKey, { price: n })}
                      onBlur={() => persistRow(m._localKey)}
                      disabled={!canEdit}
                      placeholder="0.00"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ minWidth: 80, textAlign: 'right', alignSelf: 'center' }}>
                    <div style={miniLabel}>LINE</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--forest-800)' }}>
                      {money(lineTotal)}
                    </div>
                  </div>
                </div>

                {isMaterial && cost !== null && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--stone-500)',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon.receipts width="12" height="12" /> Cost basis:
                      <strong style={{ color: 'var(--cedar-700)' }}>{money(cost)}</strong>
                    </span>
                    {m.markupBps !== undefined && (
                      <span>
                        + {(m.markupBps / 100).toFixed(0)}% markup
                      </span>
                    )}
                    <span>
                      = margin <strong>{money(Math.max(0, lineTotal - cost))}</strong>
                    </span>
                  </div>
                )}

                <div style={{ fontSize: 11.5, color: 'var(--stone-500)', minHeight: 14 }}>
                  {m._saving && 'Saving…'}
                  {!m._saving && m._error && <span style={{ color: '#a02020' }}>{m._error}</span>}
                  {!m._saving && !m._error && !m.id && m.name.trim() === '' && 'New row — type a name'}
                  {!m._saving && !m._error && !m.id && m.name.trim() !== '' && 'Unsaved — blur to save'}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function KindLabel({ kind }: { kind: InvoiceLineItem['kind'] }) {
  if (kind === 'custom') return null
  const labels: Record<Exclude<InvoiceLineItem['kind'], 'custom'>, string> = {
    labor: 'Labor',
    material: 'Material',
    disposal: 'Disposal',
  }
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--stone-500)', marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {labels[kind]}
    </div>
  )
}

// Helper to notify parent of subtotal changes without a render loop
function useNotifyOnChange(value: number, cb?: (n: number) => void) {
  const ref = useRef<number | undefined>(undefined)
  if (ref.current !== value) {
    ref.current = value
    if (cb) queueMicrotask(() => cb(value))
  }
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
const miniLabel: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '0.06em',
  fontWeight: 700,
  color: 'var(--stone-500)',
  marginBottom: 4,
  textTransform: 'uppercase',
}
const iconBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 10,
  border: '1px solid var(--cream-200)',
  background: '#fff',
  color: 'var(--stone-500)',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
