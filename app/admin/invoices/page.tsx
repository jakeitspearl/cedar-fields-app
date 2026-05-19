'use client'

import { useState } from 'react'
import { InvoicesScreen, InvoiceDetail, QBSheet } from '@/components/screens/Invoices'
import type { Invoice } from '@/lib/data'

const blankInvoice = (): Invoice => ({
  id: 'new',
  client: '',
  job: '',
  total: 0,
  status: 'draft',
  statusLabel: 'Draft',
  qbStatus: 'not-synced',
  laborHrs: 0,
  yardage: 0,
  disposal: 0,
  materials: [],
})

export default function InvoicesPage() {
  const [open, setOpen] = useState<Invoice | null>(null)
  const [qbSheet, setQbSheet] = useState(false)
  const [qbConnected, setQbConnected] = useState(true)

  if (open) return <InvoiceDetail invoice={open} onClose={() => setOpen(null)} />

  return (
    <>
      <InvoicesScreen
        qbConnected={qbConnected}
        onOpenInvoice={setOpen}
        onNew={() => setOpen(blankInvoice())}
        onOpenQB={() => setQbSheet(true)}
      />
      {qbSheet && (
        <QBSheet
          connected={qbConnected}
          onClose={() => setQbSheet(false)}
          onToggle={() => {
            setQbConnected((v) => !v)
            setQbSheet(false)
          }}
        />
      )}
    </>
  )
}
