export type Material = {
  id?: string
  name: string
  qty: number
  price: number
  tbd: boolean
  tbdNote?: string
}

export type Estimate = {
  id: string
  clientId: string
  client: string
  job: string
  date: string
  status: 'draft' | 'pending' | 'ready' | 'sent' | 'accepted'
  statusLabel: string
  laborHrs: number
  yardage: number
  disposal: number
  disposalRate: number
  materials: Material[]
  flatFee?: number
  flatFeeLabel?: string
}

export type Client = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  jobs: number
  open: number
  initials: string
}

export type RecurringJob = {
  id: string
  clientId?: string
  client: string
  service: string
  price: number
  frequency: string
  next: string            // formatted display ("Apr 28")
  nextDate?: string       // ISO YYYY-MM-DD for editing
  workerIds?: string[]
  workers?: string[]      // worker names for display (optional)
  estimateId?: string
}

export type OneTimeJob = {
  id: string
  clientId?: string
  client: string
  type: string
  workers: string[]
  workerIds?: string[]
  status: 'scheduled' | 'in-progress' | 'complete'
  statusLabel: string
  date: string             // formatted display ("Apr 26")
  scheduledDate?: string   // ISO YYYY-MM-DD for editing
  notes: string
  price: number
  estimateId?: string
}

export type Invoice = {
  id: string
  clientId?: string
  client: string
  job: string
  total: number | null
  status: 'draft' | 'sent' | 'paid'
  statusLabel: string
  due?: string
  qbStatus: 'synced' | 'not-synced' | 'failed'
  laborHrs?: number
  yardage?: number
  disposal?: number
  materials?: Material[]
  fromEstimate?: string
  fromJob?: string
  // Real (DB-backed) line items + tax flag
  lineItems?: InvoiceLineItem[]
  applyTax?: boolean
  notes?: string
}

export type InvoiceLineItem = {
  id?: string
  name: string
  qty: number
  price: number          // unit price in dollars
  kind: 'labor' | 'material' | 'disposal' | 'custom'
  costCents?: number     // owner's cost basis (materials only)
  markupBps?: number     // markup applied (e.g. 3000 = 30%)
}

export type Receipt = {
  id: string
  date: string
  vendor: string
  amount: number
  client: string
  category: 'Materials' | 'Gas' | 'Disposal'
  color: string
}

export const LABOR_RATE = 45
export const DISPOSAL_RATE = 85
export const TAX_RATE = 0.08625

export const DATA: {
  clients: Client[]
  estimates: Estimate[]
  recurringJobs: RecurringJob[]
  oneTimeJobs: OneTimeJob[]
  invoices: Invoice[]
  receipts: Receipt[]
} = {
  clients: [
    { id: 'c1', name: 'Peggy Thornton', phone: '(631) 555-0142', email: 'peggy.t@mail.com', address: '14 Ridge Rd, Southold', jobs: 8, open: 1, initials: 'PT' },
    { id: 'c2', name: 'Mike Delgado', phone: '(631) 555-0188', email: 'mike.d@mail.com', address: '212 Beach Ln, Southampton', jobs: 4, open: 2, initials: 'MD' },
    { id: 'c3', name: 'Johnson Property', phone: '(631) 555-0106', email: 'dj@johnsonhomes.com', address: '47 Oak Ave, Cutchogue', jobs: 12, open: 1, initials: 'JP' },
    { id: 'c4', name: 'Sarah Whitaker', phone: '(631) 555-0231', email: 'swhitaker@mail.com', address: '9 Dune Path, Sag Harbor', jobs: 3, open: 0, initials: 'SW' },
    { id: 'c5', name: 'Tom & Linda Rourke', phone: '(631) 555-0119', email: 'trourke@mail.com', address: '88 Main St, Greenport', jobs: 6, open: 1, initials: 'TR' },
    { id: 'c6', name: 'Vineyard Estate LLC', phone: '(631) 555-0173', email: 'ops@vineyardestate.com', address: '301 Sound Ave, Mattituck', jobs: 15, open: 0, initials: 'VE' },
  ],
  estimates: [
    {
      id: 'e1', clientId: 'c1', client: 'Peggy Thornton', job: 'Spring Mulch Install — Front Beds', date: 'Apr 18', status: 'pending', statusLabel: 'Pending Materials',
      laborHrs: 6, yardage: 3, disposal: 1.5, disposalRate: 85,
      materials: [
        { name: 'Hardwood Mulch — 3 yd', qty: 3, price: 45, tbd: false },
        { name: 'Edging — Black Aluminum', qty: 40, price: 0, tbd: true, tbdNote: 'Pending Nursery Call' },
      ],
    },
    {
      id: 'e2', clientId: 'c3', client: 'Johnson Property', job: 'Retaining Wall — North Slope', date: 'Apr 21', status: 'draft', statusLabel: 'Draft',
      laborHrs: 28, yardage: 0, disposal: 2, disposalRate: 85,
      materials: [
        { name: 'Allan Block — Charcoal', qty: 120, price: 8.5, tbd: false },
        { name: 'Crushed Stone Base', qty: 4, price: 38, tbd: false },
      ],
    },
    {
      id: 'e3', clientId: 'c5', client: 'Tom & Linda Rourke', job: 'Weekly Lawn Cut — Season Renewal', date: 'Apr 15', status: 'ready', statusLabel: 'Ready to Send',
      laborHrs: 0, yardage: 0, disposal: 0, disposalRate: 85,
      materials: [],
      flatFee: 1680, flatFeeLabel: '26 visits × $65/visit',
    },
    {
      id: 'e4', clientId: 'c2', client: 'Mike Delgado', job: 'Hedge Trimming — 40ft Privet', date: 'Apr 12', status: 'sent', statusLabel: 'Sent',
      laborHrs: 4, yardage: 0, disposal: 0.5, disposalRate: 85,
      materials: [{ name: 'Disposal Bags (pro-pack)', qty: 1, price: 18, tbd: false }],
    },
    {
      id: 'e5', clientId: 'c2', client: 'Mike Delgado', job: 'Tick Treatment — 1st App.', date: 'Apr 20', status: 'draft', statusLabel: 'Draft',
      laborHrs: 1.5, yardage: 0, disposal: 0, disposalRate: 85,
      materials: [{ name: 'Tick Killz Concentrate', qty: 1, price: 0, tbd: true, tbdNote: 'Pending Nursery Call' }],
    },
  ],
  recurringJobs: [
    { id: 'r1', client: 'Vineyard Estate LLC', service: 'Weekly Lawn Cut', price: 280, frequency: 'Weekly · Tuesdays', next: 'Apr 28' },
    { id: 'r2', client: 'Johnson Property', service: 'Bi-Weekly Lawn Cut', price: 95, frequency: 'Bi-weekly · Fridays', next: 'Apr 25' },
    { id: 'r3', client: 'Tom & Linda Rourke', service: 'Weekly Lawn Cut', price: 65, frequency: 'Weekly · Wednesdays', next: 'Apr 23' },
    { id: 'r4', client: 'Sarah Whitaker', service: 'Lawn + Edging', price: 110, frequency: 'Weekly · Thursdays', next: 'Apr 24' },
  ],
  oneTimeJobs: [
    { id: 'o1', client: 'Peggy Thornton', type: 'Spring Mulch Install', workers: ['Dad', 'Luca'], status: 'scheduled', statusLabel: 'Scheduled', date: 'Apr 26', notes: 'Access through side gate. Dog stays inside.', price: 895 },
    { id: 'o2', client: 'Johnson Property', type: 'Retaining Wall', workers: ['Dad', 'Luca'], status: 'in-progress', statusLabel: 'In Progress', date: 'Apr 21—30', notes: 'Material stacked at top of driveway. Call before arriving.', price: 4850 },
    { id: 'o3', client: 'Mike Delgado', type: 'Hedge Trimming', workers: ['Luca'], status: 'complete', statusLabel: 'Complete', date: 'Apr 19', notes: 'Privet along east property line. Customer approved.', price: 320 },
  ],
  invoices: [
    { id: 'i1', clientId: 'c2', client: 'Mike Delgado', job: 'Hedge Trimming — 40ft Privet', total: 312, status: 'paid', statusLabel: 'Paid', due: 'Paid Apr 20', qbStatus: 'synced', laborHrs: 4, yardage: 0, disposal: 0.5, materials: [{ name: 'Disposal Bags', qty: 1, price: 18, tbd: false }], fromEstimate: 'e4' },
    { id: 'i2', clientId: 'c6', client: 'Vineyard Estate LLC', job: 'April — Weekly Cuts', total: 1120, status: 'sent', statusLabel: 'Sent', due: 'Due May 5', qbStatus: 'synced' },
    { id: 'i3', clientId: 'c5', client: 'Tom & Linda Rourke', job: 'Spring Cleanup', total: 540, status: 'draft', statusLabel: 'Draft', due: 'Draft', qbStatus: 'not-synced' },
    { id: 'i4', clientId: 'c1', client: 'Peggy Thornton', job: 'Mulch Top-up — Back Bed', total: 245, status: 'sent', statusLabel: 'Sent', due: 'Due Apr 30', qbStatus: 'failed' },
  ],
  receipts: [
    { id: 'rc1', date: 'Apr 21', vendor: 'Peconic Nursery', amount: 384.22, client: 'Johnson Property', category: 'Materials', color: '#6b8e4e' },
    { id: 'rc2', date: 'Apr 21', vendor: 'Shell — Riverhead', amount: 68.40, client: 'Unassigned', category: 'Gas', color: '#c77a3c' },
    { id: 'rc3', date: 'Apr 20', vendor: 'Home Depot — Calverton', amount: 112.87, client: 'Peggy Thornton', category: 'Materials', color: '#6b8e4e' },
    { id: 'rc4', date: 'Apr 19', vendor: 'Town Dump — Southold', amount: 42.00, client: 'Mike Delgado', category: 'Disposal', color: '#7b6b4e' },
    { id: 'rc5', date: 'Apr 18', vendor: 'BP — Mattituck', amount: 74.10, client: 'Unassigned', category: 'Gas', color: '#c77a3c' },
    { id: 'rc6', date: 'Apr 17', vendor: 'Long Island Stone Supply', amount: 1248.00, client: 'Johnson Property', category: 'Materials', color: '#6b8e4e' },
  ],
}

export function estimateTotals(est: Estimate) {
  if (est.flatFee) {
    return { labor: 0, materials: 0, disposal: 0, subtotal: est.flatFee, total: est.flatFee, hasTBD: false }
  }
  const labor = (est.laborHrs || 0) * LABOR_RATE
  const disposal = (est.disposal || 0) * (est.disposalRate || DISPOSAL_RATE)
  const materials = (est.materials || []).reduce((s, m) => s + (m.tbd ? 0 : m.qty * m.price), 0)
  const subtotal = labor + materials + disposal
  const hasTBD = (est.materials || []).some((m) => m.tbd)
  return { labor, materials, disposal, subtotal, total: subtotal, hasTBD }
}
