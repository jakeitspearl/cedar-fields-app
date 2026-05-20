'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EstimatesScreen, EstimateDetail, type EstimatePatch } from '@/components/screens/Estimates'
import type { Client, Estimate } from '@/lib/data'
import { createClient as createSupabase } from '@/lib/supabase/client'
import { AttachmentsPanel } from './AttachmentsPanel'
import { MaterialsPanel } from './MaterialsPanel'
import { NewEstimateSheet } from './NewEstimateSheet'
import { estimateTotals } from '@/lib/data'

export type AttachmentView = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  kind: 'image' | 'video' | 'other'
  url: string | null
  createdAt: string
}

function patchToDb(p: EstimatePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (p.clientId !== undefined) out.client_id = p.clientId
  if (p.job !== undefined) out.job_description = p.job
  if (p.status !== undefined) out.status = p.status
  if (p.laborHrs !== undefined) out.labor_hours = p.laborHrs
  if (p.yardage !== undefined) out.yardage = p.yardage
  if (p.disposal !== undefined) out.disposal_yards = p.disposal
  out.updated_at = new Date().toISOString()
  return out
}

export function EstimatesPageClient({
  estimates,
  attachmentsByEstimate,
  clients,
  companyId,
  companyName,
  isOwner,
}: {
  estimates: Estimate[] | null
  attachmentsByEstimate: Record<string, AttachmentView[]>
  clients: Client[]
  companyId: string | null
  companyName: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState<Estimate | null>(null)
  const [newSheetOpen, setNewSheetOpen] = useState(false)

  const canPatch = isOwner && companyId !== null

  async function patchEstimate(id: string, patch: EstimatePatch) {
    if (!canPatch) return { ok: false as const, error: 'Owner-only' }
    const supabase = createSupabase()
    const { error } = await supabase.from('estimates').update(patchToDb(patch)).eq('id', id)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const }
  }

  function clientForEst(est: Estimate): Client | null {
    return clients.find((c) => c.id === est.clientId) ?? null
  }

  async function handleDownloadPDF(current: Estimate) {
    const { generateEstimatePDFBlob, pdfFileName } = await import('./pdf')
    const blob = await generateEstimatePDFBlob({
      est: current,
      client: clientForEst(current),
      companyName,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFileName({ id: current.id, client: current.client, job: current.job })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleSendEmail(current: Estimate) {
    const client = clientForEst(current)
    const total = estimateTotals(current)
    const moneyFmt = (n: number) =>
      '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const subject = `Estimate from ${companyName}${current.job ? ` — ${current.job}` : ''}`
    const lines = [
      `Hi${client?.name ? ' ' + client.name.split(' ')[0] : ''},`,
      '',
      `Here is the estimate for ${current.job || 'your project'}:`,
      '',
      `  Total: ${moneyFmt(total.total)}`,
      `  Estimate #${current.id.slice(0, 8).toUpperCase()}`,
      '',
      `The full PDF is attached. Reply with any questions.`,
      '',
      `Thanks,`,
      `${companyName}`,
    ]
    const body = lines.join('\n')
    const params = new URLSearchParams({ subject, body })
    const to = client?.email ? encodeURIComponent(client.email) : ''
    // Download the PDF first so the user can attach it from their Downloads folder.
    handleDownloadPDF(current).finally(() => {
      window.location.href = `mailto:${to}?${params.toString()}`
    })
  }

  if (open) {
    const isExisting = open.id !== 'new'
    return (
      <EstimateDetail
        est={open}
        onClose={() => {
          setOpen(null)
          router.refresh()
        }}
        clients={clients}
        allowAddClient={false}
        onPatch={isExisting && canPatch ? (p) => patchEstimate(open.id, p) : undefined}
        onDownloadPDF={isExisting ? handleDownloadPDF : undefined}
        onSendEmail={isExisting ? handleSendEmail : undefined}
        onConvertToJob={
          isExisting && isOwner
            ? (current) => router.push(`/admin/jobs?fromEstimate=${current.id}`)
            : undefined
        }
        materialsSlot={
          isExisting ? (
            <MaterialsPanel
              estimateId={open.id}
              initial={open.materials ?? []}
              canEdit={isOwner}
            />
          ) : null
        }
        attachmentsSlot={
          isExisting ? (
            <AttachmentsPanel
              estimateId={open.id}
              companyId={companyId}
              isOwner={isOwner}
              initial={attachmentsByEstimate[open.id] ?? []}
            />
          ) : null
        }
      />
    )
  }

  return (
    <>
      <EstimatesScreen
        estimates={estimates ?? undefined}
        onOpenEstimate={setOpen}
        onNew={() => setNewSheetOpen(true)}
      />
      {newSheetOpen && (
        <NewEstimateSheet
          clients={clients}
          companyId={companyId}
          onClose={() => setNewSheetOpen(false)}
          onCreated={(id, clientId, clientName, job) => {
            setNewSheetOpen(false)
            // Open the new estimate immediately with the values we just set.
            const newEst: Estimate = {
              id,
              clientId,
              client: clientName,
              job,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              status: 'draft',
              statusLabel: 'Draft',
              laborHrs: 0,
              yardage: 0,
              disposal: 0,
              disposalRate: 85,
              materials: [],
            }
            setOpen(newEst)
            // Trigger a server refresh so the list reflects it when user comes back.
            router.refresh()
          }}
        />
      )}
    </>
  )
}
