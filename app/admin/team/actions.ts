'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSessionProfile } from '@/lib/supabase/profile'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isValidUsername, usernameToEmail } from '@/lib/worker-auth'

export type ActionResult = { ok: true } | { ok: false; error: string }

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function inviteTeamMember(formData: FormData): Promise<ActionResult> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Only owners can add team members.' }

  const fullName = String(formData.get('full_name') || '').trim()
  const password = String(formData.get('password') || '')
  const roleRaw = String(formData.get('role') || 'worker')

  if (!fullName) return { ok: false, error: 'Enter the full name.' }
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (roleRaw !== 'worker' && roleRaw !== 'owner') return { ok: false, error: 'Invalid role.' }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'Supabase admin credentials not configured.' }
  }

  let email: string
  let username: string | null = null

  if (roleRaw === 'worker') {
    username = String(formData.get('username') || '').trim().toLowerCase()
    if (!username) return { ok: false, error: 'Enter a username.' }
    if (!isValidUsername(username)) {
      return {
        ok: false,
        error: 'Username must be 2–32 characters, letters/digits/._- only, starting and ending with a letter or digit.',
      }
    }
    email = usernameToEmail(username)
  } else {
    email = String(formData.get('email') || '').trim().toLowerCase()
    if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' }
  }

  const admin = adminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      invited_to_company: profile.companyId,
      invited_role: roleRaw,
      ...(username ? { invited_username: username } : {}),
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (username && (msg.includes('already') || msg.includes('exists') || msg.includes('registered'))) {
      return { ok: false, error: `Username "${username}" is already taken.` }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/admin/team')
  return { ok: true }
}

export type RoleUpdate = { profileId: string; role: 'owner' | 'worker' }

export async function updateTeamMemberRole(input: RoleUpdate): Promise<ActionResult> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Only owners can change roles.' }
  if (input.profileId === profile.userId) return { ok: false, error: 'You cannot change your own role here.' }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: input.role })
    .eq('id', input.profileId)
    .eq('company_id', profile.companyId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/team')
  return { ok: true }
}

export type PasswordReset = { profileId: string; newPassword: string }

export async function resetTeamMemberPassword(input: PasswordReset): Promise<ActionResult> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Only owners can reset passwords.' }
  if (input.profileId === profile.userId) return { ok: false, error: 'Use the regular account flow to change your own password.' }
  if (input.newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }

  // Verify the target profile is in the caller's company before touching auth.
  const supabase = await createServerClient()
  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', input.profileId)
    .maybeSingle()
  if (targetErr || !target) return { ok: false, error: 'Team member not found.' }
  if (target.company_id !== profile.companyId) return { ok: false, error: 'Not your team member.' }

  const admin = adminClient()
  const { error } = await admin.auth.admin.updateUserById(input.profileId, { password: input.newPassword })
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}
