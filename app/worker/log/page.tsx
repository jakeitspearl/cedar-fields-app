'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA } from '@/lib/data'
import { TopBar } from '@/components/Shared'
import { createClient } from '@/lib/supabase/client'

const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

type ClientOpt = { id: string; name: string }

function LogForm() {
  const router = useRouter()
  const params = useSearchParams()
  const initialClient = params.get('client') || ''
  const [clients, setClients] = useState<ClientOpt[]>(
    DATA.clients.map((c) => ({ id: c.id, name: c.name })),
  )
  const [client, setClient] = useState(initialClient)
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'Materials' | 'Gas' | 'Disposal'>('Materials')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [hasNoPurchases, setHasNoPurchases] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    const supabase = createClient()
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data && data.length) setClients(data)
      })
  }, [])

  const canSubmit =
    !!client.trim() &&
    !submitting &&
    (hasNoPurchases || (!!amount.trim() && !!description.trim() && !!photoFile))

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      if (!supabaseConfigured) {
        await new Promise((r) => setTimeout(r, 400))
        setSubmitted(true)
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/worker/log')
        return
      }

      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      if (pErr || !profile) throw new Error(pErr?.message || 'Profile not found')

      let photoPath: string | null = null
      if (photoFile && !hasNoPurchases) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
        photoPath = `${profile.company_id}/${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('receipts')
          .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false })
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`)
      }

      const clientObj = clients.find((c) => c.name === client)
      const amountCents = hasNoPurchases ? 0 : Math.round(parseFloat(amount || '0') * 100)

      const { error: insErr } = await supabase.from('receipts').insert({
        company_id: profile.company_id,
        worker_id: user.id,
        client_id: clientObj?.id ?? null,
        vendor: vendor || null,
        amount_cents: amountCents,
        category: hasNoPurchases ? 'other' : category.toLowerCase(),
        description: description || null,
        receipt_photo_url: photoPath,
        no_purchases_confirmation: hasNoPurchases,
      })
      if (insErr) throw new Error(insErr.message)

      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setVendor('')
    setAmount('')
    setDescription('')
    setPhotoFile(null)
    setPhotoPreview(null)
    setHasNoPurchases(false)
    setError(null)
  }

  if (submitted) {
    return (
      <>
        <TopBar title="Logged" sub="Saved to admin dashboard" />
        <div className="screen-body">
          <div
            className="card"
            style={{
              cursor: 'default',
              padding: 24,
              textAlign: 'center',
              background: 'var(--sage-50)',
              border: '1px solid var(--forest-500)',
            }}
          >
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--forest-700)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Icon.check width="28" height="28" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest-800)' }}>
              Logged for {client}
            </div>
            <div style={{ fontSize: 13, color: 'var(--stone-600)', marginTop: 4 }}>
              {hasNoPurchases ? 'Confirmed no purchases this shift.' : `${category} · $${amount}`}
            </div>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={reset}>
            Log another
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Log Expense" sub="Attribution required" />
      <div className="screen-body">
        <div className="banner info">
          <Icon.warn width="20" height="20" />
          <div>
            <div className="b-title">Pick a client before submitting</div>
            Receipts without a client get held up in admin review.
          </div>
        </div>

        <div className="field">
          <label>Client *</label>
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div
          className="segment"
          style={{ opacity: hasNoPurchases ? 0.4 : 1, pointerEvents: hasNoPurchases ? 'none' : 'auto' }}
        >
          {(['Materials', 'Gas', 'Disposal'] as const).map((c) => (
            <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        <div
          className="field"
          style={{ opacity: hasNoPurchases ? 0.4 : 1, pointerEvents: hasNoPurchases ? 'none' : 'auto' }}
        >
          <label>Vendor</label>
          <input
            placeholder="e.g. Peconic Nursery"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>

        <div
          className="field"
          style={{ opacity: hasNoPurchases ? 0.4 : 1, pointerEvents: hasNoPurchases ? 'none' : 'auto' }}
        >
          <label>Amount *</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div
          className="field"
          style={{ opacity: hasNoPurchases ? 0.4 : 1, pointerEvents: hasNoPurchases ? 'none' : 'auto' }}
        >
          <label>What was it for? *</label>
          <input
            placeholder="e.g. 3 yd hardwood mulch"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={pickPhoto}
        />

        <div
          style={{
            border: '1px dashed ' + (photoFile ? 'var(--forest-500)' : 'var(--stone-300)'),
            background: photoFile ? 'var(--sage-50)' : '#fff',
            borderRadius: 14,
            padding: 16,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: hasNoPurchases ? 0.4 : 1,
            pointerEvents: hasNoPurchases ? 'none' : 'auto',
          }}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Receipt preview"
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--cream-100)', color: 'var(--stone-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon.camera width="22" height="22" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--forest-800)' }}>
              {photoFile ? 'Receipt attached' : 'Snap a receipt photo *'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--stone-500)', marginTop: 2 }}>
              {photoFile ? photoFile.name : 'Required for non-zero expenses'}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            style={{
              height: 38,
              fontSize: 13,
              background: photoFile ? 'var(--cream-100)' : 'var(--forest-700)',
              color: photoFile ? 'var(--forest-800)' : '#fff',
            }}
            onClick={() => fileInput.current?.click()}
          >
            {photoFile ? 'Retake' : 'Snap'}
          </button>
        </div>

        <button
          onClick={() => setHasNoPurchases((v) => !v)}
          style={{
            width: '100%',
            background: hasNoPurchases ? 'var(--cream-100)' : 'transparent',
            border: '1px dashed var(--stone-400)',
            borderRadius: 12,
            padding: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: 'var(--stone-600)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          {hasNoPurchases ? '✓ No purchases this shift (confirmed)' : 'Or — confirm no purchases this shift'}
        </button>

        {error && (
          <div className="banner err" style={{ marginBottom: 14 }}>
            <div>{error}</div>
          </div>
        )}

        <button className="btn btn-primary btn-block" disabled={!canSubmit} onClick={submit}>
          <Icon.send width="16" height="16" /> {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogForm />
    </Suspense>
  )
}
