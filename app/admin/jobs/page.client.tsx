'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { JobsScreen, JobDetail, type AnyJob } from '@/components/screens/Jobs'
import type { Client, OneTimeJob, RecurringJob } from '@/lib/data'
import { JobEditPanel } from './JobEditPanel'
import { NewJobSheet } from './NewJobSheet'

const JobsCalendar = dynamic(() => import('./JobsCalendar').then((m) => m.JobsCalendar), {
  ssr: false,
  loading: () => (
    <div className="card" style={{ padding: 24, marginTop: 18, textAlign: 'center', color: 'var(--stone-500)', fontSize: 13 }}>
      Loading calendar…
    </div>
  ),
})

export type WorkerOption = {
  id: string
  name: string
  role: 'owner' | 'worker'
}

export type EstimatePrefill = {
  estimateId: string
  clientId: string
  clientName: string
  service: string
  priceTotal: number
}

export function JobsPageClient({
  recurring,
  oneTime,
  clients,
  workers,
  companyId,
  isOwner,
  estimatePrefill,
}: {
  recurring: RecurringJob[]
  oneTime: OneTimeJob[]
  clients: Client[]
  workers: WorkerOption[]
  companyId: string | null
  isOwner: boolean
  estimatePrefill: EstimatePrefill | null
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [newSheetOpen, setNewSheetOpen] = useState(false)
  const [tab, setTab] = useState<'recurring' | 'onetime'>('recurring')

  useEffect(() => {
    if (estimatePrefill && isOwner) setNewSheetOpen(true)
  }, [estimatePrefill, isOwner])

  const openJob = useMemo<AnyJob | null>(() => {
    if (!openId) return null
    const r = recurring.find((j) => j.id === openId)
    if (r) return { ...r, kind: 'recurring' }
    const o = oneTime.find((j) => j.id === openId)
    if (o) return { ...o, kind: 'onetime' }
    return null
  }, [openId, recurring, oneTime])

  if (openJob) {
    return (
      <JobDetail
        job={openJob}
        onClose={() => {
          setOpenId(null)
          router.refresh()
        }}
        detailSlot={
          <JobEditPanel
            key={openJob.id}
            initial={openJob}
            clients={clients}
            workers={workers}
            canEdit={isOwner}
          />
        }
      />
    )
  }

  return (
    <>
      <JobsScreen
        recurring={recurring}
        oneTime={oneTime}
        tab={tab}
        onTabChange={setTab}
        onOpenJob={(j) => {
          setTab(j.kind)
          setOpenId(j.id)
        }}
        onNew={isOwner ? () => setNewSheetOpen(true) : undefined}
        footerSlot={
          <JobsCalendar
            recurring={recurring}
            oneTime={oneTime}
            onSelectJob={(jobId, kind) => {
              setTab(kind)
              setOpenId(jobId)
            }}
          />
        }
      />
      {newSheetOpen && (
        <NewJobSheet
          clients={clients}
          workers={workers}
          companyId={companyId}
          prefill={
            estimatePrefill
              ? {
                  clientId: estimatePrefill.clientId,
                  service: estimatePrefill.service,
                  price: estimatePrefill.priceTotal,
                  estimateId: estimatePrefill.estimateId,
                }
              : undefined
          }
          onClose={() => {
            setNewSheetOpen(false)
            if (estimatePrefill) router.replace('/admin/jobs')
          }}
          onCreated={(result) => {
            setNewSheetOpen(false)
            if (estimatePrefill) router.replace('/admin/jobs')
            setTab(result.kind)
            setOpenId(result.jobId)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
