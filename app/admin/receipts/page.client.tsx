'use client'

import { useState } from 'react'
import { ReceiptsScreen, ScanSheet } from '@/components/screens/Receipts'
import type { Receipt } from '@/lib/data'

export function ReceiptsPageClient({ receipts }: { receipts?: Receipt[] }) {
  const [scanSheet, setScanSheet] = useState(false)
  return (
    <>
      <ReceiptsScreen onScan={() => setScanSheet(true)} receipts={receipts} />
      {scanSheet && <ScanSheet onClose={() => setScanSheet(false)} />}
    </>
  )
}
