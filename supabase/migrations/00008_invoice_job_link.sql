-- Allow an invoice to be linked to the job it bills for, separate from the
-- optional estimate link. Used by the "Generate Invoice from Completed Job"
-- flow so we can pull labor hours from time_entries and material costs from
-- receipts, apply a markup, and produce editable invoice line items.

alter table invoices
  add column if not exists job_id uuid references jobs(id) on delete set null;

create index if not exists invoices_job_id_idx on invoices(job_id);
