'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import type { EstimateRef } from './page.client'
import { generateLinesFromEstimate } from './generate'

export function GenerateFromEstimateSheet({
  invoiceId,
  estimates,
  onClose,
}: {
  invoiceId: string
  estimates: EstimateRef[]
  onClose: () => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string>(estimates[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setError(null)
    if (!selected) return
    setBusy(true)
    const result = await generateLinesFromEstimate(invoiceId, selected)
    setBusy(false)
    if (result.ok) {
      onClose()
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '80%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>From Estimate</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          {estimates.length === 0 ? (
            <div className="card" style={{ padding: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 14 }}>
              No estimates available. Create or accept an estimate first.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginBottom: 10 }}>
                Pick an estimate. Its labor, materials, and disposal will copy into editable line items on this invoice.
              </div>
              {estimates.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  className="card"
                  style={{
                    padding: 14,
                    marginBottom: 8,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    border: selected === e.id ? '2px solid var(--forest-700)' : '1px solid var(--cream-200)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.clientName}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--stone-600)', marginTop: 2 }}>{e.job}</div>
                    <div style={{ fontSize: 11, color: 'var(--stone-500)', marginTop: 4, textTransform: 'capitalize' }}>
                      {e.status}
                    </div>
                  </div>
                  {selected === e.id && <Icon.check width="18" height="18" />}
                </button>
              ))}
            </>
          )}
          {error && (
            <div className="banner err" style={{ marginTop: 10 }}>
              <div>{error}</div>
            </div>
          )}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            onClick={go}
            disabled={busy || !selected || estimates.length === 0}
          >
            <Icon.check width="16" height="16" /> {busy ? 'Copying…' : 'Copy line items'}
          </button>
        </div>
      </div>
    </>
  )
}
