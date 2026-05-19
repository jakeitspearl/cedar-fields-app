'use client'

import { useState } from 'react'
import { JobsScreen, JobDetail, type AnyJob } from '@/components/screens/Jobs'

export default function JobsPage() {
  const [open, setOpen] = useState<AnyJob | null>(null)
  if (open) return <JobDetail job={open} onClose={() => setOpen(null)} />
  return <JobsScreen onOpenJob={setOpen} />
}
