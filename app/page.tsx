import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/supabase/profile'

export default async function Home() {
  const profile = await getSessionProfile()
  if (profile) {
    redirect(profile.role === 'owner' ? '/admin' : '/worker')
  }

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="center-stage">
      <div className="center-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--forest-700), var(--cedar-600))',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            }}
          >
            CF
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest-800)', letterSpacing: '-0.01em' }}>
              Cedar Fields
            </div>
            <div style={{ fontSize: 13, color: 'var(--stone-500)', marginTop: -2 }}>
              Landscaping field app
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--stone-600)', lineHeight: 1.5, margin: '0 0 24px' }}>
          Estimates, jobs, invoices, receipts, and crew time-tracking — all in one place.
        </p>

        {supabaseConfigured ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Link href="/signup" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>
              Create owner account
            </Link>
            <Link href="/login" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="banner warn">
              <div>
                <div className="b-title">Demo mode</div>
                Supabase isn&apos;t configured yet — data is mock. Add env vars to enable accounts.
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/admin" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>
                Open Owner dashboard (demo)
              </Link>
              <Link href="/worker" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>
                Open Worker app (demo)
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
