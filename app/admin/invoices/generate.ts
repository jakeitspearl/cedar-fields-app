'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/supabase/profile'
import { revalidatePath } from 'next/cache'

export type GenerateResult = { ok: true } | { ok: false; error: string }

export async function generateLinesFromEstimate(
  invoiceId: string,
  estimateId: string,
): Promise<GenerateResult> {
  const profile = await getSessionProfile()
  if (!profile) return { ok: false, error: 'Not signed in.' }
  if (profile.role !== 'owner') return { ok: false, error: 'Owner-only.' }

  const supabase = await createClient()

  // Fetch the estimate + its materials in this owner's company.
  const [estRes, matRes, companyRes] = await Promise.all([
    supabase
      .from('estimates')
      .select('id, client_id, job_description, labor_hours, disposal_yards, flat_fee_cents, flat_fee_label')
      .eq('id', estimateId)
      .maybeSingle(),
    supabase
      .from('estimate_materials')
      .select('name, qty, unit_price_cents, tbd, position')
      .eq('estimate_id', estimateId)
      .order('position'),
    supabase
      .from('companies')
      .select('labor_rate_cents, disposal_rate_cents')
      .eq('id', profile.companyId)
      .maybeSingle(),
  ])

  if (estRes.error || !estRes.data) return { ok: false, error: 'Estimate not found.' }
  const est = estRes.data
  const laborRate = companyRes.data?.labor_rate_cents ?? 4500
  const disposalRate = companyRes.data?.disposal_rate_cents ?? 8500

  // Clear existing lines on this invoice, then insert fresh from the estimate.
  const { error: delErr } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId)
  if (delErr) return { ok: false, error: delErr.message }

  const lines: Array<{
    invoice_id: string
    position: number
    name: string
    qty: number
    unit_price_cents: number
    kind: 'labor' | 'material' | 'disposal' | 'custom'
  }> = []
  let pos = 0

  if (est.flat_fee_cents && est.flat_fee_cents > 0) {
    lines.push({
      invoice_id: invoiceId,
      position: pos++,
      name: est.flat_fee_label || 'Flat fee',
      qty: 1,
      unit_price_cents: est.flat_fee_cents,
      kind: 'custom',
    })
  } else {
    if (Number(est.labor_hours) > 0) {
      lines.push({
        invoice_id: invoiceId,
        position: pos++,
        name: 'Labor',
        qty: Number(est.labor_hours),
        unit_price_cents: laborRate,
        kind: 'labor',
      })
    }
    for (const m of matRes.data ?? []) {
      if (m.tbd) continue // Skip TBD materials — owner can add them manually if needed
      lines.push({
        invoice_id: invoiceId,
        position: pos++,
        name: m.name,
        qty: Number(m.qty),
        unit_price_cents: m.unit_price_cents,
        kind: 'material',
      })
    }
    if (Number(est.disposal_yards) > 0) {
      lines.push({
        invoice_id: invoiceId,
        position: pos++,
        name: 'Disposal',
        qty: Number(est.disposal_yards),
        unit_price_cents: disposalRate,
        kind: 'disposal',
      })
    }
  }

  if (lines.length > 0) {
    const { error: insErr } = await supabase.from('invoice_line_items').insert(lines)
    if (insErr) return { ok: false, error: insErr.message }
  }

  // Set the estimate link on the invoice and recompute total
  const total = lines.reduce((s, l) => s + l.qty * l.unit_price_cents, 0)
  await supabase
    .from('invoices')
    .update({
      estimate_id: estimateId,
      client_id: est.client_id,
      job_reference: est.job_description || 'From estimate',
      total_cents: total,
    })
    .eq('id', invoiceId)

  revalidatePath('/admin/invoices')
  return { ok: true }
}
