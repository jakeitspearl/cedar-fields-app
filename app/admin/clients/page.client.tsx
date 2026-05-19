'use client'

import { useState } from 'react'
import { ClientsScreen, ClientDetail } from '@/components/screens/Clients'
import { EstimateDetail } from '@/components/screens/Estimates'
import { JobDetail, type AnyJob } from '@/components/screens/Jobs'
import type { Client, Estimate } from '@/lib/data'

type Stack =
  | { kind: 'client'; payload: Client }
  | { kind: 'estimate'; payload: Estimate }
  | { kind: 'job'; payload: AnyJob }

export function ClientsPageClient({ clients }: { clients?: Client[] }) {
  const [stack, setStack] = useState<Stack[]>([])
  const top = stack[stack.length - 1]
  const push = (s: Stack) => setStack((p) => [...p, s])
  const pop = () => setStack((p) => p.slice(0, -1))

  if (top?.kind === 'estimate') return <EstimateDetail est={top.payload} onClose={pop} />
  if (top?.kind === 'job') return <JobDetail job={top.payload} onClose={pop} />
  if (top?.kind === 'client')
    return (
      <ClientDetail
        client={top.payload}
        onClose={pop}
        onOpenEstimate={(e) => push({ kind: 'estimate', payload: e })}
        onOpenJob={(j) => push({ kind: 'job', payload: j })}
      />
    )

  return (
    <ClientsScreen
      clients={clients}
      onOpenClient={(c) => push({ kind: 'client', payload: c })}
    />
  )
}
