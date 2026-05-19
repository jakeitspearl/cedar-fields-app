'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      if (!data.session) {
        // Email confirmation is on — tell them
        setInfo('Check your email to confirm your account, then sign in.')
        return
      }
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-stage">
      <div className="center-card">
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest-800)', marginBottom: 4 }}>
          Create your owner account
        </div>
        <div style={{ fontSize: 13, color: 'var(--stone-600)', marginBottom: 24 }}>
          Sets up Cedar Fields with demo data you can poke at
        </div>

        {!supabaseConfigured && (
          <div className="banner warn">
            <div>
              <div className="b-title">Supabase not configured</div>
              Add credentials to <code>.env.local</code> and restart the dev server.
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <label>Your name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Shawn"
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@cedarfields.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="8+ chars"
            />
          </div>

          {error && (
            <div className="banner err" style={{ marginBottom: 14 }}>
              <div>{error}</div>
            </div>
          )}
          {info && (
            <div className="banner info" style={{ marginBottom: 14 }}>
              <div>{info}</div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !supabaseConfigured}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--stone-500)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--forest-700)', fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
