'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/lib/icons'
import { createClient } from '@/lib/supabase/client'
import { NumberInput } from '@/components/NumberInput'
import type { Client } from '@/lib/data'

const CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'gas', label: 'Gas' },
  { value: 'disposal', label: 'Disposal' },
  { value: 'other', label: 'Other' },
] as const

type Category = (typeof CATEGORIES)[number]['value']

function uuidish(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'r-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function NewReceiptSheet({
  clients,
  companyId,
  workerId,
  onClose,
}: {
  clients: Client[]
  companyId: string
  workerId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [category, setCategory] = useState<Category>('materials')
  const [occurredOn, setOccurredOn] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [clientId, setClientId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function submit() {
    setError(null)
    if (!vendor.trim()) return setError('Enter a vendor.')
    if (amount <= 0) return setError('Enter an amount greater than $0.')

    setSubmitting(true)
    const supabase = createClient()

    let photoPath: string | null = null
    if (photoFile) {
      const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
      photoPath = `${companyId}/${workerId}/${uuidish()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false })
      if (upErr) {
        setSubmitting(false)
        setError(`Photo upload failed: ${upErr.message}`)
        return
      }
    }

    const { error: insErr } = await supabase.from('receipts').insert({
      company_id: companyId,
      worker_id: workerId,
      client_id: clientId || null,
      vendor: vendor.trim(),
      amount_cents: Math.round(amount * 100),
      category,
      occurred_on: occurredOn,
      description: description.trim() || null,
      receipt_photo_url: photoPath,
      no_purchases_confirmation: false,
    })

    setSubmitting(false)
    if (insErr) {
      // Roll back uploaded photo if DB insert failed
      if (photoPath) {
        await supabase.storage.from('receipts').remove([photoPath])
      }
      setError(insErr.message)
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" style={{ maxHeight: '94%' }}>
        <div className="handle" />
        <div className="sheet-head">
          <h2>Log Receipt</h2>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="sheet-body">
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1.5 }}>
              <label>Vendor</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Peconic Nursery"
                style={inputStyle}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Amount</label>
              <NumberInput value={amount} onChange={setAmount} placeholder="0.00" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Date</label>
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                style={inputStyle}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={selectStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Client (optional)</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Unassigned —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 6 }}>
              Pin a receipt to a client so it shows up when you generate that client&apos;s invoice.
            </div>
          </div>

          <div className="field">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What was this for?"
            />
          </div>

          <div className="field">
            <label>Photo (optional)</label>
            {photoPreview ? (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--cream-200)',
                  background: 'var(--cream-100)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Receipt" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'contain' }} />
                <button
                  type="button"
                  onClick={clearPhoto}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="touch-only"
                  style={pillBtn(true)}
                >
                  <Icon.camera width="14" height="14" w={2.2} /> Take photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={pillBtn(false)}
                >
                  <Icon.plus width="14" height="14" w={2.2} /> Choose file
                </button>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={pickPhoto}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={pickPhoto}
            />
          </div>

          {error && (
            <div className="banner err">
              <div>{error}</div>
            </div>
          )}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            onClick={submit}
            disabled={submitting || !vendor.trim() || amount <= 0}
          >
            <Icon.check width="16" height="16" /> {submitting ? 'Saving…' : 'Log receipt'}
          </button>
        </div>
      </div>
    </>
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

function pillBtn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    borderRadius: 12,
    background: primary ? 'var(--forest-700)' : '#fff',
    color: primary ? '#fff' : 'var(--forest-800)',
    border: primary ? 'none' : '1px solid var(--cream-200)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}
