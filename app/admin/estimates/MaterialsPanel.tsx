'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/utils'
import type { Material } from '@/lib/data'
import { NumberInput } from '@/components/NumberInput'

type Row = Material & { _localKey: string; _saving?: boolean; _error?: string }

let _seq = 0
const newKey = () => `__new_${++_seq}`

function toCents(n: number): number {
  return Math.round(n * 100)
}

function dbPatchFor(row: Row, idx: number) {
  return {
    position: idx,
    name: row.name,
    qty: Number.isFinite(row.qty) ? row.qty : 0,
    unit_price_cents: toCents(Number.isFinite(row.price) ? row.price : 0),
    tbd: row.tbd,
    tbd_note: row.tbdNote ?? null,
  }
}

export function MaterialsPanel({
  estimateId,
  initial,
  canEdit,
}: {
  estimateId: string
  initial: Material[]
  canEdit: boolean
}) {
  const [items, setItems] = useState<Row[]>(() =>
    initial.map((m) => ({ ...m, _localKey: m.id ?? newKey() })),
  )
  const focusRefByKey = useRef<Record<string, HTMLInputElement | null>>({})

  function patch(localKey: string, p: Partial<Row>) {
    setItems((prev) => prev.map((r) => (r._localKey === localKey ? { ...r, ...p } : r)))
  }

  async function persistRow(localKey: string) {
    if (!canEdit) return
    const row = items.find((r) => r._localKey === localKey)
    if (!row) return
    const idx = items.findIndex((r) => r._localKey === localKey)
    if (!row.name.trim() && !row.id) {
      // empty draft — don't save yet
      return
    }
    patch(localKey, { _saving: true, _error: undefined })
    const supabase = createClient()

    if (!row.id) {
      const { data, error } = await supabase
        .from('estimate_materials')
        .insert({ estimate_id: estimateId, ...dbPatchFor(row, idx) })
        .select('id')
        .single()
      if (error || !data) {
        patch(localKey, { _saving: false, _error: error?.message ?? 'Save failed' })
        return
      }
      patch(localKey, { id: data.id, _saving: false })
    } else {
      const { error } = await supabase
        .from('estimate_materials')
        .update(dbPatchFor(row, idx))
        .eq('id', row.id)
      patch(localKey, { _saving: false, _error: error?.message })
    }
  }

  async function toggleTbd(localKey: string) {
    if (!canEdit) return
    const row = items.find((r) => r._localKey === localKey)
    if (!row) return
    patch(localKey, { tbd: !row.tbd })
    // Persist immediately if the row is already saved; for unsaved rows, persistRow
    // will pick it up on next blur.
    if (row.id) {
      const supabase = createClient()
      patch(localKey, { _saving: true })
      const { error } = await supabase
        .from('estimate_materials')
        .update({ tbd: !row.tbd })
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
      const { error } = await supabase.from('estimate_materials').delete().eq('id', row.id)
      if (error) {
        patch(localKey, { _error: error.message })
        return
      }
    }
    setItems((prev) => prev.filter((r) => r._localKey !== localKey))
  }

  function addRow() {
    const key = newKey()
    setItems((prev) => [
      ...prev,
      { _localKey: key, name: '', qty: 1, price: 0, tbd: false },
    ])
    // Focus the newly added name input after render
    requestAnimationFrame(() => {
      focusRefByKey.current[key]?.focus()
    })
  }

  return (
    <>
      <div className="section-h" style={{ marginTop: 18 }}>
        <span>Materials</span>
        {canEdit && (
          <button
            onClick={addRow}
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
            + Add item
          </button>
        )}
      </div>

      <div className="card" style={{ cursor: 'default', padding: '4px 14px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '14px 0', fontSize: 13, color: 'var(--stone-500)', textAlign: 'center' }}>
            No materials yet. Tap <strong>+ Add item</strong> to add one.
          </div>
        ) : (
          items.map((m) => {
            const lineTotal = m.tbd ? null : (m.qty || 0) * (m.price || 0)
            return (
              <div
                key={m._localKey}
                className="line-item"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input
                    ref={(el) => {
                      focusRefByKey.current[m._localKey] = el
                    }}
                    value={m.name}
                    onChange={(e) => patch(m._localKey, { name: e.target.value })}
                    onBlur={() => persistRow(m._localKey)}
                    placeholder="Material name (e.g. Hardwood Mulch — 3 yd)"
                    disabled={!canEdit}
                    style={inputStyle}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeRow(m._localKey)}
                      title="Delete row"
                      style={iconBtn}
                      aria-label="Delete row"
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
                      {lineTotal === null ? '—' : money(lineTotal)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className={'tbd-toggle' + (m.tbd ? '' : ' off')}
                    onClick={() => toggleTbd(m._localKey)}
                    disabled={!canEdit}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {m.tbd ? '⚠ TBD — Pending price' : '✓ Price confirmed'}
                  </button>
                  <div style={{ fontSize: 11.5, color: 'var(--stone-500)', minHeight: 16 }}>
                    {m._saving && 'Saving…'}
                    {!m._saving && m._error && <span style={{ color: '#a02020' }}>{m._error}</span>}
                    {!m._saving && !m._error && !m.id && m.name.trim() === '' && 'New row — type a name'}
                    {!m._saving && !m._error && !m.id && m.name.trim() !== '' && 'Unsaved — blur to save'}
                  </div>
                </div>
              </div>
            )
          })
        )}
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
