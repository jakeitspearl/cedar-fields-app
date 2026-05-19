'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-stage">
      <div className="center-card">
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest-800)', marginBottom: 4 }}>
          Sign in
        </div>
        <div style={{ fontSize: 13, color: 'var(--stone-600)', marginBottom: 24 }}>
          Cedar Fields field app
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="banner err" style={{ marginBottom: 14 }}>
              <div>{error}</div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !supabaseConfigured}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--stone-500)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--forest-700)', fontWeight: 600 }}>
            ← Back
          </Link>
        </div>
      </div>
    </div>
  )
}
