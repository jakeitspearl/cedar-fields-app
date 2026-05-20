'use client'

import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import { estimateTotals, type Client, type Estimate, LABOR_RATE } from '@/lib/data'

const COLORS = {
  ink: '#1a1f1a',
  forest: '#1b3a27',
  stone: '#78756a',
  stoneLight: '#a8a395',
  cream: '#ebe6d8',
  creamBg: '#faf7f0',
  sage: '#f1f4ec',
  cedar: '#7b4620',
} as const

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: COLORS.ink,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cream,
    paddingBottom: 18,
    marginBottom: 22,
  },
  brandName: { fontSize: 18, color: COLORS.forest, fontFamily: 'Helvetica-Bold' },
  brandSub: { fontSize: 9, color: COLORS.stone, marginTop: 2 },
  metaLabel: { fontSize: 8, color: COLORS.stoneLight, textTransform: 'uppercase', letterSpacing: 1 },
  metaValue: { fontSize: 12, marginTop: 1, fontFamily: 'Helvetica-Bold' },
  metaBlock: { textAlign: 'right' },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.stoneLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  twoCol: { flexDirection: 'row', gap: 24, marginBottom: 22 },
  col: { flex: 1 },
  clientName: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  clientLine: { fontSize: 10, marginTop: 2 },
  jobBox: {
    backgroundColor: COLORS.creamBg,
    borderRadius: 6,
    padding: 12,
    marginBottom: 22,
  },
  jobLabel: { fontSize: 8, color: COLORS.stoneLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  jobText: { fontSize: 11, lineHeight: 1.45 },
  table: { marginBottom: 16 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cream,
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.cream,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  cellHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: COLORS.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellDesc: { flex: 3, paddingRight: 8, fontSize: 10 },
  cellQty: { flex: 0.7, fontSize: 10, textAlign: 'right' },
  cellUnit: { flex: 1, fontSize: 10, textAlign: 'right' },
  cellAmt: { flex: 1.2, fontSize: 10, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  smallNote: { fontSize: 8.5, color: COLORS.stoneLight, marginTop: 2 },
  tbdNote: { fontSize: 8.5, color: COLORS.cedar, marginTop: 2 },
  totalsCard: {
    backgroundColor: COLORS.forest,
    color: '#fff',
    borderRadius: 8,
    padding: 18,
    marginTop: 8,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalsLabel: { fontSize: 9, color: '#dfe7df' },
  totalsValue: { fontSize: 11, color: '#fff', fontFamily: 'Helvetica-Bold' },
  totalsDivider: { borderTopWidth: 0.5, borderTopColor: '#3a6a49', marginVertical: 8 },
  grandLabel: { fontSize: 10, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  grandValue: { fontSize: 22, color: '#fff', fontFamily: 'Helvetica-Bold' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.stoneLight,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.cream,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

function money(n: number, dec = 2) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtToday() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function EstimateDocument({
  est,
  client,
  companyName,
}: {
  est: Estimate
  client: Client | null
  companyName: string
}) {
  const t = estimateTotals(est)
  const labor = (est.laborHrs || 0) * LABOR_RATE
  const disposalRate = est.disposalRate || 85
  const disposal = (est.disposal || 0) * disposalRate

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{companyName}</Text>
            <Text style={styles.brandSub}>Landscape Services</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Estimate</Text>
            <Text style={styles.metaValue}>#{est.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.brandSub, { marginTop: 6 }]}>{fmtToday()}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Prepared for</Text>
            {client ? (
              <>
                <Text style={styles.clientName}>{client.name}</Text>
                {client.address && <Text style={styles.clientLine}>{client.address}</Text>}
                {client.phone && <Text style={styles.clientLine}>{client.phone}</Text>}
                {client.email && <Text style={styles.clientLine}>{client.email}</Text>}
              </>
            ) : (
              <Text style={styles.clientLine}>{est.client}</Text>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={styles.clientName}>{est.statusLabel}</Text>
          </View>
        </View>

        {est.job && (
          <View style={styles.jobBox}>
            <Text style={styles.jobLabel}>Scope of Work</Text>
            <Text style={styles.jobText}>{est.job}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Line Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.cellDesc, styles.cellHead]}>Description</Text>
            <Text style={[styles.cellQty, styles.cellHead]}>Qty</Text>
            <Text style={[styles.cellUnit, styles.cellHead]}>Unit</Text>
            <Text style={[styles.cellAmt, styles.cellHead]}>Amount</Text>
          </View>

          {est.laborHrs > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.cellDesc}>Labor</Text>
              <Text style={styles.cellQty}>{est.laborHrs}</Text>
              <Text style={styles.cellUnit}>{money(LABOR_RATE)}/hr</Text>
              <Text style={styles.cellAmt}>{money(labor)}</Text>
            </View>
          )}

          {est.disposal > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.cellDesc}>Disposal</Text>
              <Text style={styles.cellQty}>{est.disposal}</Text>
              <Text style={styles.cellUnit}>{money(disposalRate)}/yd</Text>
              <Text style={styles.cellAmt}>{money(disposal)}</Text>
            </View>
          )}

          {(est.materials || []).map((m, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={{ flex: 3, paddingRight: 8 }}>
                <Text style={styles.cellDesc}>{m.name}</Text>
                {m.tbd && <Text style={styles.tbdNote}>Pricing TBD{m.tbdNote ? ` — ${m.tbdNote}` : ''}</Text>}
              </View>
              <Text style={styles.cellQty}>{m.qty}</Text>
              <Text style={styles.cellUnit}>{m.tbd ? '—' : money(m.price)}</Text>
              <Text style={styles.cellAmt}>{m.tbd ? '—' : money(m.qty * m.price)}</Text>
            </View>
          ))}

          {est.yardage > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.cellDesc}>
                Yardage <Text style={styles.smallNote}>(tracking only)</Text>
              </Text>
              <Text style={styles.cellQty}>{est.yardage}</Text>
              <Text style={styles.cellUnit}>—</Text>
              <Text style={styles.cellAmt}>—</Text>
            </View>
          )}

          {est.flatFee !== undefined && est.flatFee !== null && (
            <View style={styles.tableRow}>
              <View style={{ flex: 3, paddingRight: 8 }}>
                <Text style={styles.cellDesc}>Flat Seasonal Rate</Text>
                {est.flatFeeLabel && <Text style={styles.smallNote}>{est.flatFeeLabel}</Text>}
              </View>
              <Text style={styles.cellQty}>1</Text>
              <Text style={styles.cellUnit}>{money(est.flatFee)}</Text>
              <Text style={styles.cellAmt}>{money(est.flatFee)}</Text>
            </View>
          )}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{money(t.subtotal)}</Text>
          </View>
          <View style={styles.totalsDivider} />
          <View style={[styles.totalsRow, { alignItems: 'flex-end', marginTop: 4 }]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{money(t.total)}</Text>
          </View>
          {t.hasTBD && (
            <Text style={[styles.totalsLabel, { marginTop: 6 }]}>
              Excludes TBD materials — final price may change.
            </Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{companyName}</Text>
          <Text>Estimate #{est.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateEstimatePDFBlob(args: {
  est: Estimate
  client: Client | null
  companyName: string
}): Promise<Blob> {
  return await pdf(<EstimateDocument {...args} />).toBlob()
}

export function pdfFileName(est: { id: string; client: string; job: string }): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `Estimate-${est.id.slice(0, 8)}-${safe(est.client) || 'client'}.pdf`
}
