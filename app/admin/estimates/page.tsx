'use client'

import { useState } from 'react'
import { EstimatesScreen, EstimateDetail } from '@/components/screens/Estimates'
import type { Estimate } from '@/lib/data'

const blankEstimate = (): Estimate => ({
  id: 'new',
  clientId: 'c1',
  client: 'Peggy Thornton',
  job: '',
  date: 'Apr 22',
  status: 'draft',
  statusLabel: 'Draft',
  laborHrs: 0,
  yardage: 0,
  disposal: 0,
  disposalRate: 85,
  materials: [],
})

export default function EstimatesPage() {
  const [open, setOpen] = useState<Estimate | null>(null)

  if (open) return <EstimateDetail est={open} onClose={() => setOpen(null)} />

  return <EstimatesScreen onOpenEstimate={setOpen} onNew={() => setOpen(blankEstimate())} />
}
