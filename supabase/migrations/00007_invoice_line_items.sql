-- Invoices now have their own editable line items, copied from the source
-- estimate or computed from a completed job. The invoice's total is the sum
-- of its line items (plus optional tax). Owners can edit any line freely
-- without touching the source estimate/job.

create table if not exists invoice_line_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  qty numeric(10,2) not null default 1,
  unit_price_cents integer not null default 0,
  kind text not null default 'custom',   -- 'labor' | 'material' | 'disposal' | 'custom'
  -- Cost tracking on the materials line (so owner sees their cost vs the marked-up sale price)
  cost_cents integer,
  markup_bps integer,                    -- markup applied (e.g. 3000 = 30%)
  created_at timestamptz not null default now()
);
create index if not exists invoice_line_items_invoice_id_idx on invoice_line_items(invoice_id);

alter table invoice_line_items enable row level security;

create policy "invoice_line_items read" on invoice_line_items
  for select using (
    exists (select 1 from invoices i where i.id = invoice_id and i.company_id = public.company_id())
  );

create policy "invoice_line_items owner write" on invoice_line_items
  for all using (
    public.is_owner()
    and exists (select 1 from invoices i where i.id = invoice_id and i.company_id = public.company_id())
  );

-- Backfill: existing invoices have a `total_cents` but no line items. To keep
-- the displayed total stable, we don't auto-populate items here; the new
-- editor treats invoices with zero line items as "blank — add lines or generate
-- from estimate/job." Owner can switch to itemized any time.
