'use client'

import { useState, useTransition } from 'react'
import { TopBar } from '@/components/Shared'
import { Icon } from '@/lib/icons'
import { inviteTeamMember, updateTeamMemberRole, resetTeamMemberPassword } from './actions'

export type TeamMember = {
  id: string
  fullName: string
  username: string | null
  role: 'owner' | 'worker'
  active: boolean
  isMe: boolean
}

export function TeamPageClient({ members, me: _me }: { members: TeamMember[]; me: TeamMember | null }) {
  const [showForm, setShowForm] = useState(false)
  const [formRole, setFormRole] = useState<'worker' | 'owner'>('worker')
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  function submit(formData: FormData) {
    setError(null)
    setOkMsg(null)
    startTransition(async () => {
      const result = await inviteTeamMember(formData)
      if (result.ok) {
        const identifier = formData.get('username') || formData.get('email')
        setOkMsg(`Added ${formData.get('full_name')} (${identifier}).`)
        setShowForm(false)
      } else {
        setError(result.error)
      }
    })
  }

  function changeRole(profileId: string, newRole: 'owner' | 'worker') {
    setError(null)
    setOkMsg(null)
    startTransition(async () => {
      const result = await updateTeamMemberRole({ profileId, role: newRole })
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <>
      <TopBar
        title="Team"
        sub={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
        right={
          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--forest-800)',
              color: '#fff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Icon.plus width="16" height="16" w={2.2} />
            <span>Add member</span>
          </button>
        }
      />
      <div className="screen-body">
        {error && <Banner kind="err">{error}</Banner>}
        {okMsg && <Banner kind="ok">{okMsg}</Banner>}

        {showForm && (
          <form
            action={submit}
            className="card"
            style={{ padding: 16, marginBottom: 14, display: 'grid', gap: 12 }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>Add team member</div>
            <Field label="Full name" name="full_name" placeholder="Riley Maddox" required />

            <div>
              <label style={fieldLabelStyle}>Role</label>
              <select
                name="role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as 'worker' | 'owner')}
                style={selectStyle}
              >
                <option value="worker">Worker — punch in, log expenses</option>
                <option value="owner">Owner — full admin access</option>
              </select>
            </div>

            {formRole === 'worker' ? (
              <>
                <Field
                  label="Username"
                  name="username"
                  placeholder="riley"
                  required
                  autoCapitalize="none"
                  hint="Workers sign in at /login with just this username and the password you set — no email needed."
                />
              </>
            ) : (
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="riley@example.com"
                required
                hint="Owners sign in with this email + password."
              />
            )}
            <Field label="Password" name="password" type="text" placeholder="8+ characters" required />

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={busy} style={primaryBtnStyle(busy)}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} disabled={busy} style={secondaryBtnStyle}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {members.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--stone-500)', fontSize: 14 }}>
            No team members yet.
          </div>
        ) : (
          members.map((m) => (
            <MemberCard
              key={m.id}
              m={m}
              busy={busy}
              onChangeRole={changeRole}
              onStartReset={() => {
                setResettingId(m.id)
                setError(null)
                setOkMsg(null)
              }}
              isResetting={resettingId === m.id}
              onCancelReset={() => setResettingId(null)}
              onConfirmReset={(pw) => {
                setError(null)
                setOkMsg(null)
                startTransition(async () => {
                  const result = await resetTeamMemberPassword({ profileId: m.id, newPassword: pw })
                  if (result.ok) {
                    setOkMsg(`Password reset for ${m.fullName}.`)
                    setResettingId(null)
                  } else {
                    setError(result.error)
                  }
                })
              }}
            />
          ))
        )}
      </div>
    </>
  )
}

function MemberCard({
  m,
  busy,
  onChangeRole,
  isResetting,
  onStartReset,
  onCancelReset,
  onConfirmReset,
}: {
  m: TeamMember
  busy: boolean
  onChangeRole: (id: string, role: 'owner' | 'worker') => void
  isResetting: boolean
  onStartReset: () => void
  onCancelReset: () => void
  onConfirmReset: (pw: string) => void
}) {
  const [pw, setPw] = useState('')
  return (
    <div className="card" style={{ padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: m.role === 'owner' ? '#dbe7d3' : 'var(--sage-100)',
            color: 'var(--forest-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {m.fullName[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            {m.fullName}
            {m.isMe && (
              <span style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--stone-500)', fontWeight: 500 }}>
                (you)
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--stone-500)' }}>
            {m.role === 'owner' ? 'Owner' : 'Worker'}
            {m.username && ` · @${m.username}`}
            {!m.active && ' · inactive'}
          </div>
        </div>
        {!m.isMe && (
          <>
            <select
              value={m.role}
              disabled={busy}
              onChange={(e) => onChangeRole(m.id, e.target.value as 'owner' | 'worker')}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid var(--cream-200)',
                background: '#fff',
                fontSize: 13.5,
                fontFamily: 'inherit',
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              <option value="worker">Worker</option>
              <option value="owner">Owner</option>
            </select>
            {!isResetting && (
              <button
                type="button"
                onClick={onStartReset}
                disabled={busy}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'transparent',
                  color: 'var(--forest-800)',
                  border: '1px solid var(--cream-200)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                title={`Reset password for ${m.fullName}`}
              >
                Reset password
              </button>
            )}
          </>
        )}
      </div>
      {isResetting && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="New password (8+ chars)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--cream-200)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            disabled={busy || pw.length < 8}
            onClick={() => onConfirmReset(pw)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--forest-800)',
              color: '#fff',
              border: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: pw.length < 8 || busy ? 'not-allowed' : 'pointer',
              opacity: pw.length < 8 || busy ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            Set
          </button>
          <button
            type="button"
            onClick={() => {
              setPw('')
              onCancelReset()
            }}
            disabled={busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--stone-500)',
              border: '1px solid var(--cream-200)',
              fontSize: 13.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function Banner({ kind, children }: { kind: 'err' | 'ok'; children: React.ReactNode }) {
  const isErr = kind === 'err'
  return (
    <div
      style={{
        padding: '10px 14px',
        marginBottom: 12,
        borderRadius: 10,
        background: isErr ? '#fdecec' : '#eaf5e6',
        color: isErr ? '#a02020' : '#3d6a2c',
        fontSize: 13.5,
        border: `1px solid ${isErr ? '#f3c4c4' : '#c8e3bd'}`,
      }}
    >
      {children}
    </div>
  )
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--stone-500)',
  display: 'block',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--cream-200)',
  background: '#fff',
  fontSize: 14.5,
  fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

function primaryBtnStyle(busy: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'var(--forest-800)',
    color: '#fff',
    border: 'none',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
    fontFamily: 'inherit',
    opacity: busy ? 0.7 : 1,
  }
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: 12,
  background: 'transparent',
  color: 'var(--stone-500)',
  border: '1px solid var(--cream-200)',
  fontSize: 14.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  autoCapitalize,
  hint,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  autoCapitalize?: string
  hint?: string
}) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        autoCapitalize={autoCapitalize}
        style={inputStyle}
      />
      {hint && (
        <div style={{ fontSize: 11.5, color: 'var(--stone-500)', marginTop: 6, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  )
}
