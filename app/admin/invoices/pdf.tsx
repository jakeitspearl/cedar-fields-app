'use client'

import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Client, Invoice } from '@/lib/data'
import type { ComputedTotals } from './InvoiceEditPanel'

const COLORS = {
  ink: '#1a1f1a',
  forest: '#1b3a27',
  stone: '#78756a',
  stoneLight: '#a8a395',
  cream: '#ebe6d8',
  creamBg: '#faf7f0',
} as const

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: COLORS.ink },
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
  jobBox: { backgroundColor: COLORS.creamBg, borderRadius: 6, padding: 12, marginBottom: 22 },
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
  },
  cellHead: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: COLORS.stone, textTransform: 'uppercase', letterSpacing: 0.5 },
  cellDesc: { flex: 3, paddingRight: 8, fontSize: 10 },
  cellQty: { flex: 0.7, fontSize: 10, textAlign: 'right' },
  cellUnit: { flex: 1, fontSize: 10, textAlign: 'right' },
  cellAmt: { flex: 1.2, fontSize: 10, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  totalsCard: {
    backgroundColor: COLORS.forest,
    color: '#fff',
    borderRadius: 8,
    padding: 18,
    marginTop: 8,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
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

function money(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtToday() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function InvoiceDocument({
  inv,
  client,
  companyName,
  computed,
}: {
  inv: Invoice
  client: Client | null
  companyName: string
  computed: ComputedTotals
}) {
  const items = inv.lineItems ?? []
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{companyName}</Text>
            <Text style={styles.brandSub}>Landscape Services</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={styles.metaValue}>#INV-{inv.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.brandSub, { marginTop: 6 }]}>{fmtToday()}</Text>
            {inv.due && <Text style={[styles.brandSub, { marginTop: 2 }]}>{inv.due}</Text>}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Bill to</Text>
            {client ? (
              <>
                <Text style={styles.clientName}>{client.name}</Text>
                {client.address && <Text style={styles.clientLine}>{client.address}</Text>}
                {client.phone && <Text style={styles.clientLine}>{client.phone}</Text>}
                {client.email && <Text style={styles.clientLine}>{client.email}</Text>}
              </>
            ) : (
              <Text style={styles.clientLine}>{inv.client}</Text>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Status</Text>
            <Text style={styles.clientName}>{inv.statusLabel}</Text>
          </View>
        </View>

        {inv.job && (
          <View style={styles.jobBox}>
            <Text style={styles.jobLabel}>For</Text>
            <Text style={styles.jobText}>{inv.job}</Text>
          </View>
        )}

        {items.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.sectionLabel}>Line Items</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.cellDesc, styles.cellHead]}>Description</Text>
              <Text style={[styles.cellQty, styles.cellHead]}>Qty</Text>
              <Text style={[styles.cellUnit, styles.cellHead]}>Unit</Text>
              <Text style={[styles.cellAmt, styles.cellHead]}>Amount</Text>
            </View>
            {items.map((m, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellDesc}>{m.name}</Text>
                <Text style={styles.cellQty}>{m.qty}</Text>
                <Text style={styles.cellUnit}>{money(m.price)}</Text>
                <Text style={styles.cellAmt}>{money(m.qty * m.price)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalsCard}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{money(computed.subtotal)}</Text>
          </View>
          {inv.applyTax && computed.tax > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({(computed.taxRate * 100).toFixed(3)}%)</Text>
              <Text style={styles.totalsValue}>{money(computed.tax)}</Text>
            </View>
          )}
          <View style={styles.totalsDivider} />
          <View style={[styles.totalsRow, { alignItems: 'flex-end', marginTop: 4 }]}>
            <Text style={styles.grandLabel}>Amount Due</Text>
            <Text style={styles.grandValue}>{money(computed.total)}</Text>
          </View>
          {inv.due && <Text style={[styles.totalsLabel, { marginTop: 6 }]}>{inv.due}</Text>}
        </View>

        <View style={styles.footer} fixed>
          <Text>{companyName}</Text>
          <Text>#INV-{inv.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDFBlob(args: {
  inv: Invoice
  client: Client | null
  companyName: string
  computed: ComputedTotals
}): Promise<Blob> {
  return await pdf(<InvoiceDocument {...args} />).toBlob()
}

export function invoicePdfFileName(inv: { id: string; client: string }): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `Invoice-${inv.id.slice(0, 8)}-${safe(inv.client) || 'client'}.pdf`
}
