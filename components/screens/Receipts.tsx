'use client'

import { Icon } from '@/lib/icons'
import { DATA, type Receipt } from '@/lib/data'
import { money } from '@/lib/utils'
import { TopBar } from '../Shared'

const catColors: Record<string, string> = {
  Materials: '#6b8e4e',
  Gas: '#c77a3c',
  Disposal: '#7b6b4e',
}

export function ReceiptsScreen({
  onScan,
  receipts,
}: {
  onScan: () => void
  receipts?: Receipt[]
}) {
  const recs = receipts ?? DATA.receipts
  const totalMonth = recs.reduce((s, r) => s + r.amount, 0)
  return (
    <>
      <TopBar
        title="Receipts"
        sub={`${recs.length} this month · ${money(totalMonth, 0)} total`}
      />
      <div className="screen-body">
        <button
          onClick={onScan}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--cedar-600), var(--cedar-700))',
            color: '#fff',
            border: 'none',
            borderRadius: 18,
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(155,90,43,0.25)',
            marginBottom: 16,
            fontFamily: 'inherit',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon.camera width="26" height="26" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>Scan Receipt</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Photo → auto-extract total & vendor</div>
          </div>
          <Icon.chev width="18" height="18" />
        </button>

        <div className="section-h">Recent</div>
        {recs.map((r) => (
          <div key={r.id} className="card" style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 68,
                borderRadius: 10,
                flexShrink: 0,
                background:
                  'repeating-linear-gradient(0deg, #fff, #fff 4px, ' + r.color + '15 4px, ' + r.color + '15 5px)',
                border: '1px solid var(--cream-200)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 8,
                  background:
                    'repeating-linear-gradient(90deg, transparent 0 4px, var(--cream-200) 4px 5px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '6px 4px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ height: 3, background: r.color + '80', borderRadius: 2 }} />
                <div style={{ height: 2, background: 'var(--stone-300)', width: '60%' }} />
                <div style={{ height: 2, background: 'var(--stone-300)', width: '80%' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.vendor}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--forest-800)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {money(r.amount)}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 4,
                }}
              >
                <div style={{ fontSize: 11.5, color: 'var(--stone-500)' }}>{r.date}</div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: catColors[r.category] || 'var(--stone-600)',
                    background: (catColors[r.category] || '#78756a') + '18',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {r.category}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: r.client === 'Unassigned' ? 'var(--cedar-700)' : 'var(--stone-600)',
                  marginTop: 3,
                  fontWeight: r.client === 'Unassigned' ? 700 : 500,
                }}
              >
                {r.client === 'Unassigned' ? '⚠ Unassigned — tap to assign' : '→ ' + r.client}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function ScanSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '80%', background: '#111', color: '#fff' }}>
        <div className="handle" style={{ background: '#444' }} />
        <div className="sheet-head" style={{ background: '#111', borderBottomColor: '#222' }}>
          <h2 style={{ color: '#fff' }}>Scan Receipt</h2>
          <button className="close" onClick={onClose} style={{ background: '#333', color: '#fff' }}>
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div
            style={{
              aspectRatio: '3/4',
              background: '#000',
              borderRadius: 14,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid #222',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '12% 14%',
                border: '2px dashed rgba(255,255,255,0.5)',
                borderRadius: 10,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '12%',
                left: '14%',
                width: 24,
                height: 24,
                borderTop: '3px solid #b97a45',
                borderLeft: '3px solid #b97a45',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '12%',
                right: '14%',
                width: 24,
                height: 24,
                borderTop: '3px solid #b97a45',
                borderRight: '3px solid #b97a45',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '12%',
                left: '14%',
                width: 24,
                height: 24,
                borderBottom: '3px solid #b97a45',
                borderLeft: '3px solid #b97a45',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '12%',
                right: '14%',
                width: 24,
                height: 24,
                borderBottom: '3px solid #b97a45',
                borderRight: '3px solid #b97a45',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 18,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Align receipt within frame
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button
              style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '4px solid #333', cursor: 'pointer' }}
              aria-label="Capture"
            />
          </div>
        </div>
      </div>
    </>
  )
}
