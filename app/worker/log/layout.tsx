import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/supabase/profile'

// Expense logging is not enabled for workers at this company. Owners can still
// reach this route via the role switch; workers get bounced to /worker.
export default async function WorkerLogLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (profile && profile.role === 'worker') {
    redirect('/worker')
  }
  return <>{children}</>
}
