'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { InvoicesScreen, QBSheet } from '@/components/screens/Invoices'
import { createClient } from '@/lib/supabase/client'
import type { Client, Invoice } from '@/lib/data'
import { InvoiceEditPanel, type ComputedTotals } from './InvoiceEditPanel'
import { NewInvoiceSheet } from './NewInvoiceSheet'
import { GenerateFromEstimateSheet } from './GenerateFromEstimateSheet'
import { GenerateFromJobSheet } from './GenerateFromJobSheet'

export type EstimateRef = {
  id: string
  clientId: string
  clientName: string
  job: string
  status: string
}

export type JobRef = {
  id: string
  clientId: string
  clientName: string
  service: string
  status: string
  scheduledDate: string | null
  estimateId: string | null
}

export function InvoicesPageClient({
  invoices,
  clients,
  estimates,
  jobs,
  companyId,
  companyName,
  isOwner,
  salesTaxBps,
  qbConnected: qbConnectedProp,
}: {
  invoices: Invoice[] | null
  clients: Client[]
  estimates: EstimateRef[]
  jobs: JobRef[]
  companyId: string | null
  companyName: string
  isOwner: boolean
  salesTaxBps: number
  laborRateCents: number
  disposalRateCents: number
  qbConnected: boolean
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newSheetOpen, setNewSheetOpen] = useState(false)
  const [genEstOpen, setGenEstOpen] = useState(false)
  const [genJobOpen, setGenJobOpen] = useState(false)
  const [qbSheet, setQbSheet] = useState(false)
  const [qbConnected, setQbConnected] = useState(qbConnectedProp)

  const list = invoices ?? []
  const openInv = useMemo(() => list.find((i) => i.id === openId) ?? null, [openId, list])

  async function handleDownloadPDF(current: Invoice, computed: ComputedTotals) {
    const { generateInvoicePDFBlob, invoicePdfFileName } = await import('./pdf')
    const client = clients.find((c) => c.id === current.clientId) ?? null
    const blob = await generateInvoicePDFBlob({ inv: current, client, companyName, computed })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = invoicePdfFileName({ id: current.id, client: current.client })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleSendEmail(current: Invoice, computed: ComputedTotals) {
    const client = clients.find((c) => c.id === current.clientId) ?? null
    const moneyFmt = (n: number) =>
      '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const subject = `Invoice from ${companyName}${current.job ? ` — ${current.job}` : ''}`
    const lines = [
      `Hi${client?.name ? ' ' + client.name.split(' ')[0] : ''},`,
      '',
      `Invoice #INV-${current.id.slice(0, 8).toUpperCase()} is attached.`,
      `Total: ${moneyFmt(computed.total)}${current.due ? ' (' + current.due + ')' : ''}`,
      '',
      `Reply with any questions.`,
      '',
      `Thanks,`,
      `${companyName}`,
    ]
    const params = new URLSearchParams({ subject, body: lines.join('\n') })
    const to = client?.email ? encodeURIComponent(client.email) : ''
    handleDownloadPDF(current, computed).finally(() => {
      window.location.href = `mailto:${to}?${params.toString()}`
    })
  }

  if (openInv) {
    return (
      <>
        <InvoiceEditPanel
          key={openInv.id}
          initial={openInv}
          clients={clients}
          canEdit={isOwner}
          salesTaxBps={salesTaxBps}
          qbConnected={qbConnected}
          onClose={() => {
            setOpenId(null)
            router.refresh()
          }}
          onDownloadPDF={handleDownloadPDF}
          onSendInvoice={handleSendEmail}
          onOpenQBSheet={() => setQbSheet(true)}
          onGenerateFromEstimate={isOwner && estimates.length > 0 ? () => setGenEstOpen(true) : undefined}
          onGenerateFromJob={isOwner && jobs.length > 0 ? () => setGenJobOpen(true) : undefined}
        />
        {genEstOpen && (
          <GenerateFromEstimateSheet
            invoiceId={openInv.id}
            estimates={estimates}
            onClose={() => setGenEstOpen(false)}
          />
        )}
        {genJobOpen && (
          <GenerateFromJobSheet
            invoiceId={openInv.id}
            jobs={jobs}
            onClose={() => setGenJobOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <InvoicesScreen
        invoices={list}
        qbConnected={qbConnected}
        onOpenInvoice={(inv) => setOpenId(inv.id)}
        onNew={isOwner ? () => setNewSheetOpen(true) : () => undefined}
        onOpenQB={() => setQbSheet(true)}
      />
      {newSheetOpen && (
        <NewInvoiceSheet
          clients={clients}
          estimates={estimates}
          jobs={jobs}
          companyId={companyId}
          onClose={() => setNewSheetOpen(false)}
          onCreated={(result) => {
            setNewSheetOpen(false)
            setOpenId(result.invoiceId)
            if (result.openGenerateFromJob) {
              // After invoice is created from a job source, immediately open
              // the markup picker on the new invoice.
              setGenJobOpen(true)
            }
            router.refresh()
          }}
        />
      )}
      {qbSheet && (
        <QBSheet
          connected={qbConnected}
          onClose={() => setQbSheet(false)}
          onToggle={async () => {
            const next = !qbConnected
            setQbConnected(next)
            setQbSheet(false)
            if (companyId) {
              const supabase = createClient()
              await supabase.from('companies').update({ qb_connected: next }).eq('id', companyId)
              router.refresh()
            }
          }}
        />
      )}
    </>
  )
}
