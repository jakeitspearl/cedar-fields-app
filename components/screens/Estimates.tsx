'use client'

import { useState } from 'react'
import { Icon } from '@/lib/icons'
import { DATA, estimateTotals, type Client, type Estimate } from '@/lib/data'
import { money } from '@/lib/utils'
import { Badge, TopBar } from '../Shared'
import { NumberInput } from '../NumberInput'

export function EstimateCard({ est, onClick }: { est: Estimate; onClick: () => void }) {
  const t = estimateTotals(est)
  return (
    <button className="card" onClick={onClick} style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 2 }}>{est.client}</div>
          <div style={{ fontSize: 13.5, color: 'var(--stone-600)', lineHeight: 1.3 }}>{est.job}</div>
        </div>
        <Badge status={est.status}>{est.statusLabel}</Badge>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--stone-500)' }}>Created {est.date}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--forest-800)', fontVariantNumeric: 'tabular-nums' }}>{money(t.total, 0)}</span>
      </div>
    </button>
  )
}

export function EstimatesScreen({
  onOpenEstimate,
  onNew,
  estimates,
}: {
  onOpenEstimate: (est: Estimate) => void
  onNew: () => void
  estimates?: Estimate[]
}) {
  const ests = estimates ?? DATA.estimates
  const byStatus: Record<string, Estimate[]> = { draft: [], pending: [], ready: [], sent: [], accepted: [] }
  ests.forEach((e) => byStatus[e.status]?.push(e))
  const order = [
    { key: 'accepted', title: 'Accepted' },
    { key: 'ready', title: 'Ready to Send' },
    { key: 'sent', title: 'Sent' },
    { key: 'pending', title: 'Pending Materials' },
    { key: 'draft', title: 'Drafts' },
  ] as const

  return (
    <>
      <TopBar title="Estimates" sub={`${ests.length} open · ${byStatus.pending.length} need follow-up`} />
      <div className="screen-body">
        <button className="new-btn" onClick={onNew}>
          <Icon.plus width="18" height="18" /> New Estimate
        </button>
        {order.map((group) =>
          byStatus[group.key].length > 0 ? (
            <div key={group.key}>
              <div className="section-h">
                <span>{group.title}</span>
                <span className="count">{byStatus[group.key].length}</span>
              </div>
              {byStatus[group.key].map((e) => (
                <EstimateCard key={e.id} est={e} onClick={() => onOpenEstimate(e)} />
              ))}
            </div>
          ) : null,
        )}
      </div>
    </>
  )
}

export type EstimatePatch = Partial<
  Pick<Estimate, 'clientId' | 'client' | 'job' | 'status' | 'statusLabel' | 'laborHrs' | 'yardage' | 'disposal'>
>

export function EstimateDetail({
  est: initial,
  onClose,
  attachmentsSlot,
  materialsSlot,
  onPatch,
  clients: clientsProp,
  allowAddClient = true,
  onDownloadPDF,
  onSendEmail,
  onConvertToJob,
}: {
  est: Estimate
  onClose: () => void
  attachmentsSlot?: React.ReactNode
  materialsSlot?: React.ReactNode
  onPatch?: (patch: EstimatePatch) => Promise<{ ok: boolean; error?: string } | void>
  clients?: Client[]
  allowAddClient?: boolean
  onDownloadPDF?: (current: Estimate) => Promise<void> | void
  onSendEmail?: (current: Estimate) => Promise<void> | void
  onConvertToJob?: (current: Estimate) => void
}) {
  const [est, setEst] = useState<Estimate>(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '' })
  const [clients, setClients] = useState<Client[]>(clientsProp ?? DATA.clients)
  const [statusOpen, setStatusOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const t = estimateTotals(est)
  const clientObj = clients.find((c) => c.id === est.clientId) || ({ name: est.client } as Partial<Client>)

  async function patch(p: EstimatePatch) {
    setEst((prev) => ({ ...prev, ...p }))
    if (!onPatch) return
    const res = await onPatch(p)
    if (res && 'ok' in res && !res.ok) {
      setSaveError(res.error ?? 'Save failed')
    } else if (saveError) {
      setSaveError(null)
    }
  }

  const STATUS_OPTIONS: { value: Estimate['status']; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Materials' },
    { value: 'ready', label: 'Ready to Send' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
  ]

  const saveNewClient = () => {
    if (!newClient.name.trim()) return
    const initials = newClient.name
      .split(' ')
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const c: Client = {
      id: 'c' + (clients.length + 1) + '_new',
      name: newClient.name,
      phone: newClient.phone || '—',
      email: newClient.email || '—',
      address: newClient.address || '—',
      jobs: 0,
      open: 0,
      initials,
    }
    const next = [c, ...clients]
    setClients(next)
    DATA.clients = next
    setEst((p) => ({ ...p, clientId: c.id, client: c.name }))
    setNewClient({ name: '', phone: '', email: '', address: '' })
    setAddOpen(false)
    setPickerOpen(false)
  }

  const toggleTBD = (idx: number) => {
    setEst((p) => ({ ...p, materials: p.materials.map((m, i) => (i === idx ? { ...m, tbd: !m.tbd } : m)) }))
  }
  const updateHrs = (v: string) => setEst((p) => ({ ...p, laborHrs: Math.max(0, parseFloat(v) || 0) }))
  const updateYrd = (v: string) => setEst((p) => ({ ...p, yardage: Math.max(0, parseFloat(v) || 0) }))
  const updateDisp = (v: string) => setEst((p) => ({ ...p, disposal: Math.max(0, parseFloat(v) || 0) }))
  const commitHrs = () => patch({ laborHrs: est.laborHrs })
  const commitYrd = () => patch({ yardage: est.yardage })
  const commitDisp = () => patch({ disposal: est.disposal })

  return (
    <>
      <TopBar
        title="Estimate"
        sub={`#${est.id.toUpperCase()} · ${est.date}`}
        onBack={onClose}
        right={
          onPatch ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setStatusOpen((s) => !s)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                aria-label="Change status"
              >
                <Badge status={est.status}>{est.statusLabel} ▾</Badge>
              </button>
              {statusOpen && (
                <>
                  <div
                    onClick={() => setStatusOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                  />
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
                      minWidth: 200,
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={async () => {
                          setStatusOpen(false)
                          if (opt.value === est.status) return
                          await patch({ status: opt.value, statusLabel: opt.label })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          background: opt.value === est.status ? 'var(--cream-100)' : 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 14,
                          borderRadius: 8,
                          color: 'var(--ink-900)',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge status={opt.value}>{opt.label}</Badge>
                        </span>
                        {opt.value === est.status && <Icon.check width="16" height="16" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <Badge status={est.status}>{est.statusLabel}</Badge>
          )
        }
      />
      {saveError && (
        <div className="banner err" style={{ marginBottom: 10 }}>
          <div>Save failed: {saveError}</div>
        </div>
      )}
      <div className="screen-body" style={{ paddingBottom: 10 }}>
        {t.hasTBD && (
          <div className="banner warn">
            <Icon.warn width="20" height="20" />
            <div>
              <div className="b-title">Estimate incomplete</div>
              Follow up on materials pricing before sending.
            </div>
          </div>
        )}

        <div className="field">
          <label>Client</label>
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              width: '100%',
              background: '#fff',
              border: '1px solid var(--cream-200)',
              borderRadius: 12,
              padding: '14px 14px',
              fontSize: 16,
              fontFamily: 'inherit',
              color: 'var(--ink-900)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {clientObj.initials && (
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--sage-100)',
                    color: 'var(--forest-800)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {clientObj.initials}
                </span>
              )}
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clientObj.name || 'Select a client'}
              </span>
            </span>
            <Icon.chev width="16" height="16" style={{ color: 'var(--stone-400)' }} />
          </button>
        </div>

        <div className="field">
          <label>Job Description</label>
          <textarea
            value={est.job}
            onChange={(e) => setEst((p) => ({ ...p, job: e.target.value }))}
            onBlur={onPatch ? () => patch({ job: est.job }) : undefined}
          />
        </div>

        <div className="section-h" style={{ marginTop: 18 }}>
          <span>Line Items</span>
        </div>

        <div className="card" style={{ cursor: 'default', padding: 14 }}>
          <div className="line-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="name">Labor</span>
              <span className="amt">{money(t.labor)}</span>
            </div>
            <div className="row">
              <div>
                <div style={{ fontSize: 11, color: 'var(--stone-500)', marginBottom: 4, fontWeight: 600 }}>HOURS</div>
                <NumberInput
                  value={est.laborHrs}
                  onChange={(n) => setEst((p) => ({ ...p, laborHrs: Math.max(0, n) }))}
                  onBlur={onPatch ? commitHrs : undefined}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--cream-200)',
                    fontSize: 15,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--stone-500)', marginBottom: 4, fontWeight: 600 }}>RATE</div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--cream-100)',
                    fontSize: 15,
                    color: 'var(--stone-600)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  $45.00/hr
                </div>
              </div>
            </div>
          </div>

          <div className="line-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="name">Yardage</span>
              <span style={{ fontSize: 12, color: 'var(--stone-500)' }}>tracking only</span>
            </div>
            <NumberInput
              value={est.yardage}
              onChange={(n) => setEst((p) => ({ ...p, yardage: Math.max(0, n) }))}
              onBlur={onPatch ? commitYrd : undefined}
              placeholder="Yards delivered"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--cream-200)',
                fontSize: 15,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div className="line-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="name">Disposal · {est.disposal || 0} yd</span>
              <span className="amt">{money(t.disposal)}</span>
            </div>
            <div className="row">
              <NumberInput
                value={est.disposal}
                onChange={(n) => setEst((p) => ({ ...p, disposal: Math.max(0, n) }))}
                onBlur={onPatch ? commitDisp : undefined}
                placeholder="Yards"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--cream-200)',
                  fontSize: 15,
                  fontFamily: 'inherit',
                }}
              />
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--cream-100)',
                  fontSize: 15,
                  color: 'var(--stone-600)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                $85/yd
              </div>
            </div>
          </div>
        </div>

        {materialsSlot ? (
          materialsSlot
        ) : (
          <>
            <div className="section-h" style={{ marginTop: 18 }}>
              <span>Materials</span>
              <button
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
            </div>
            <div className="card" style={{ cursor: 'default', padding: '4px 14px' }}>
              {(est.materials || []).map((m, i) => (
                <div key={i} className="line-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div className="name" style={{ marginBottom: 2 }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--stone-500)', fontVariantNumeric: 'tabular-nums' }}>
                        qty {m.qty} ·{' '}
                        {m.tbd ? (
                          <span style={{ color: 'var(--cedar-700)', fontWeight: 600 }}>pricing TBD</span>
                        ) : (
                          `${money(m.price)} ea`
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="amt">{m.tbd ? '—' : money(m.qty * m.price)}</span>
                    </div>
                  </div>
                  <button
                    className={'tbd-toggle' + (m.tbd ? '' : ' off')}
                    onClick={() => toggleTBD(i)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {m.tbd ? '⚠ TBD — Pending Nursery' : '✓ Price confirmed'}
                  </button>
                </div>
              ))}
              {(est.materials || []).length === 0 && (
                <div style={{ padding: '14px 0', fontSize: 13, color: 'var(--stone-500)', textAlign: 'center' }}>
                  No materials
                </div>
              )}
            </div>
          </>
        )}

        {attachmentsSlot}

        {est.flatFee && (
          <div className="card" style={{ cursor: 'default', marginTop: 10, padding: 14, background: 'var(--sage-50)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest-800)' }}>Flat Seasonal Rate</div>
                <div style={{ fontSize: 12, color: 'var(--stone-600)', marginTop: 2 }}>{est.flatFeeLabel}</div>
              </div>
              <div className="amt" style={{ fontSize: 17 }}>
                {money(est.flatFee, 0)}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--forest-800)', borderRadius: 16, color: 'var(--cream-50)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, opacity: 0.75 }}>
            <span>Subtotal</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(t.subtotal)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: 10,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.02 }}>TOTAL</span>
            <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {money(t.total)}
            </span>
          </div>
          {t.hasTBD && <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>Excludes TBD materials</div>}
        </div>

        {!t.hasTBD && est.status === 'sent' && onPatch && (
          <button
            onClick={() => patch({ status: 'accepted', statusLabel: 'Accepted' })}
            style={primaryActionStyle('var(--forest-700)')}
          >
            <Icon.check width="18" height="18" w={2.2} /> Mark as Accepted
          </button>
        )}

        {!t.hasTBD && est.status === 'accepted' && onConvertToJob && (
          <button
            onClick={() => onConvertToJob(est)}
            style={primaryActionStyle('var(--cedar-600)')}
          >
            <Icon.check width="18" height="18" w={2.2} /> Convert to Job
          </button>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={t.hasTBD || !onDownloadPDF}
            onClick={onDownloadPDF ? () => onDownloadPDF(est) : undefined}
            title={t.hasTBD ? 'Resolve TBD material prices first' : undefined}
          >
            <Icon.download width="18" height="18" /> PDF
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.4 }}
            disabled={t.hasTBD || !onSendEmail}
            onClick={onSendEmail ? () => onSendEmail(est) : undefined}
            title={t.hasTBD ? 'Resolve TBD material prices first' : undefined}
          >
            <Icon.send width="18" height="18" /> Send Email
          </button>
        </div>
      </div>

      {pickerOpen && (
        <>
          <div className="sheet-back" onClick={() => setPickerOpen(false)} />
          <div className="sheet" style={{ maxHeight: '80%' }}>
            <div className="handle" />
            <div className="sheet-head">
              <h2>Select Client</h2>
              <button className="close" onClick={() => setPickerOpen(false)}>
                ×
              </button>
            </div>
            <div className="sheet-body" style={{ paddingTop: 10 }}>
              {allowAddClient && (
              <button
                onClick={() => setAddOpen(true)}
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
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--forest-700)',
                    color: 'var(--cream-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon.plus width="18" height="18" />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Add new client</div>
                  <div style={{ fontSize: 11.5, color: 'var(--stone-600)', marginTop: 2 }}>
                    Create a client to assign to this estimate
                  </div>
                </div>
                <Icon.chev width="16" height="16" />
              </button>
              )}

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--stone-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '4px 6px 10px',
                }}
              >
                Existing Clients
              </div>
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id === est.clientId) {
                      setPickerOpen(false)
                      return
                    }
                    patch({ clientId: c.id, client: c.name })
                    setPickerOpen(false)
                  }}
                  className="card"
                  style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--sage-100)',
                      color: 'var(--forest-800)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--stone-500)' }}>{c.phone}</div>
                  </div>
                  {est.clientId === c.id && <Icon.check width="18" height="18" style={{ color: 'var(--forest-700)' }} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {addOpen && (
        <>
          <div className="sheet-back" onClick={() => setAddOpen(false)} style={{ zIndex: 20 }} />
          <div className="sheet" style={{ maxHeight: '88%', zIndex: 21 }}>
            <div className="handle" />
            <div className="sheet-head">
              <h2>New Client</h2>
              <button className="close" onClick={() => setAddOpen(false)}>
                ×
              </button>
            </div>
            <div className="sheet-body">
              <div className="field">
                <label>Name *</label>
                <input
                  autoFocus
                  value={newClient.name}
                  onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Peggy Thornton"
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(631) 555-0100"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                  placeholder="client@mail.com"
                />
              </div>
              <div className="field">
                <label>Property Address</label>
                <input
                  value={newClient.address}
                  onChange={(e) => setNewClient((p) => ({ ...p, address: e.target.value }))}
                  placeholder="14 Ridge Rd, Southold"
                />
              </div>
            </div>
            <div className="sheet-foot">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.4 }}
                disabled={!newClient.name.trim()}
                onClick={saveNewClient}
              >
                <Icon.check width="16" height="16" /> Save & Select
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function primaryActionStyle(bg: string): React.CSSProperties {
  return {
    marginTop: 14,
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    background: bg,
    color: '#fff',
    border: 'none',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }
}
