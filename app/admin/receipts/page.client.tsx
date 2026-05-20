'use client'

import { useEffect, useState } from 'react'
import { ReceiptsScreen } from '@/components/screens/Receipts'
import { createClient } from '@/lib/supabase/client'
import type { Client, Receipt } from '@/lib/data'
import { NewReceiptSheet } from './NewReceiptSheet'

export function ReceiptsPageClient({
  receipts,
  clients,
  companyId,
}: {
  receipts?: Receipt[]
  clients: Client[]
  companyId: string | null
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [workerId, setWorkerId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setWorkerId(data.user?.id ?? null))
  }, [])

  return (
    <>
      <ReceiptsScreen
        receipts={receipts}
        onLog={companyId && workerId ? () => setSheetOpen(true) : undefined}
      />
      {sheetOpen && companyId && workerId && (
        <NewReceiptSheet
          clients={clients}
          companyId={companyId}
          workerId={workerId}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
