// Workers sign in with a username only — we synthesize an email behind the scenes
// so Supabase Auth (which requires email) has a stable identifier.
// Never shown to users.

export const WORKER_EMAIL_DOMAIN = 'workers.cedar-fields.local'

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/

export function isValidUsername(u: string): boolean {
  return USERNAME_RE.test(u)
}

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${WORKER_EMAIL_DOMAIN}`
}

export function isWorkerEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${WORKER_EMAIL_DOMAIN}`)
}

// Accept either an email (has `@`) or a bare username; returns the email to
// pass to signInWithPassword.
export function loginIdentifierToEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase()
  if (trimmed.includes('@')) return trimmed
  return usernameToEmail(trimmed)
}
