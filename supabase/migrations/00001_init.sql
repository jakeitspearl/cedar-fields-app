-- Cedar Fields — initial schema
-- Single-tenant for now (Cedar Fields), but company_id columns are in place for multi-tenant later.

create extension if not exists "uuid-ossp";

-- ─────────────────────────── Companies & profiles ───────────────────────────

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid,                  -- auth.users.id of primary owner
  labor_rate_cents integer not null default 4500,    -- $45.00/hr
  disposal_rate_cents integer not null default 8500, -- $85.00/yd
  sales_tax_bps integer not null default 863,        -- 8.625% as basis points
  qb_connected boolean not null default false,
  qb_realm_id text,
  created_at timestamptz not null default now()
);

create type user_role as enum ('owner', 'worker');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role user_role not null default 'worker',
  full_name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on profiles(company_id);

-- ─────────────────────────── Clients ───────────────────────────

create table clients (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  initials text,
  created_at timestamptz not null default now()
);
create index on clients(company_id);

-- ─────────────────────────── Estimates ───────────────────────────

create type estimate_status as enum ('draft', 'pending', 'ready', 'sent');

create table estimates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  job_description text not null default '',
  status estimate_status not null default 'draft',
  labor_hours numeric(8,2) not null default 0,
  yardage numeric(8,2) not null default 0,
  disposal_yards numeric(8,2) not null default 0,
  flat_fee_cents integer,
  flat_fee_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on estimates(company_id);
create index on estimates(client_id);

create table estimate_materials (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid not null references estimates(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  qty numeric(10,2) not null default 1,
  unit_price_cents integer not null default 0,
  tbd boolean not null default false,
  tbd_note text
);
create index on estimate_materials(estimate_id);

-- ─────────────────────────── Jobs ───────────────────────────

create type job_kind as enum ('onetime', 'recurring');
create type job_status as enum ('scheduled', 'in_progress', 'complete');

create table jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  kind job_kind not null,
  service text not null,
  status job_status not null default 'scheduled',
  price_cents integer not null default 0,
  -- recurring fields
  frequency text,
  next_date date,
  -- onetime fields
  scheduled_date date,
  notes text,
  estimate_id uuid references estimates(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on jobs(company_id);
create index on jobs(client_id);

create table job_workers (
  job_id uuid not null references jobs(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  primary key (job_id, worker_id)
);

-- ─────────────────────────── Invoices ───────────────────────────

create type invoice_status as enum ('draft', 'sent', 'paid');
create type qb_sync_status as enum ('synced', 'not_synced', 'failed');

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  estimate_id uuid references estimates(id) on delete set null,
  job_reference text not null default '',
  status invoice_status not null default 'draft',
  total_cents integer,
  due_label text,
  apply_tax boolean not null default false,
  qb_status qb_sync_status not null default 'not_synced',
  qb_id text,                            -- QuickBooks invoice ID once synced
  qb_synced_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index on invoices(company_id);
create index on invoices(client_id);

-- ─────────────────────────── Receipts / expenses ───────────────────────────

create type expense_category as enum ('materials', 'gas', 'disposal', 'other');

create table receipts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  worker_id uuid references profiles(id) on delete set null,
  client_id uuid references clients(id) on delete set null,   -- nullable = "unassigned"
  vendor text,
  amount_cents integer not null,
  category expense_category not null default 'other',
  receipt_photo_url text,
  description text,
  occurred_on date not null default current_date,
  no_purchases_confirmation boolean not null default false,
  created_at timestamptz not null default now()
);
create index on receipts(company_id);
create index on receipts(client_id);
create index on receipts(worker_id);

-- ─────────────────────────── Time entries (worker punch card) ───────────────────────────

create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  hours numeric(6,2),    -- computed on punch out
  notes text,
  submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on time_entries(company_id);
create index on time_entries(worker_id);
create index on time_entries(client_id);

-- ─────────────────────────── RLS ───────────────────────────

alter table companies enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table estimates enable row level security;
alter table estimate_materials enable row level security;
alter table jobs enable row level security;
alter table job_workers enable row level security;
alter table invoices enable row level security;
alter table receipts enable row level security;
alter table time_entries enable row level security;

-- Helper: current user's company_id
create or replace function auth.company_id() returns uuid
  language sql stable as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Helper: current user is owner of their company
create or replace function auth.is_owner() returns boolean
  language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner')
$$;

-- Profiles: users see their own row; owners see everyone in their company
create policy "profiles self or company" on profiles
  for select using (id = auth.uid() or company_id = auth.company_id());
create policy "profiles owner write" on profiles
  for all using (auth.is_owner() and company_id = auth.company_id());

-- Companies: owners can read+update; everyone in the company can read their company
create policy "companies same" on companies
  for select using (id = auth.company_id());
create policy "companies owner update" on companies
  for update using (auth.is_owner() and id = auth.company_id());

-- Generic per-company tables: anyone in company can read; only owner can write (workers exempted below)
create policy "clients read" on clients
  for select using (company_id = auth.company_id());
create policy "clients owner write" on clients
  for all using (auth.is_owner() and company_id = auth.company_id());

create policy "estimates read" on estimates
  for select using (company_id = auth.company_id());
create policy "estimates owner write" on estimates
  for all using (auth.is_owner() and company_id = auth.company_id());

create policy "estimate_materials rw via estimate" on estimate_materials
  for all using (
    exists (select 1 from estimates e where e.id = estimate_id and e.company_id = auth.company_id())
    and (auth.is_owner() or false)
  );
create policy "estimate_materials read" on estimate_materials
  for select using (
    exists (select 1 from estimates e where e.id = estimate_id and e.company_id = auth.company_id())
  );

create policy "jobs read" on jobs
  for select using (company_id = auth.company_id());
create policy "jobs owner write" on jobs
  for all using (auth.is_owner() and company_id = auth.company_id());

create policy "job_workers read" on job_workers
  for select using (
    exists (select 1 from jobs j where j.id = job_id and j.company_id = auth.company_id())
  );
create policy "job_workers owner write" on job_workers
  for all using (
    auth.is_owner()
    and exists (select 1 from jobs j where j.id = job_id and j.company_id = auth.company_id())
  );

create policy "invoices owner only" on invoices
  for all using (auth.is_owner() and company_id = auth.company_id());

-- Receipts & time_entries: workers can read/write THEIR OWN, owners can read/write all in company
create policy "receipts read" on receipts
  for select using (
    company_id = auth.company_id()
    and (auth.is_owner() or worker_id = auth.uid())
  );
create policy "receipts self insert" on receipts
  for insert with check (
    company_id = auth.company_id()
    and (auth.is_owner() or worker_id = auth.uid())
  );
create policy "receipts self update" on receipts
  for update using (
    company_id = auth.company_id()
    and (auth.is_owner() or worker_id = auth.uid())
  );

create policy "time_entries read" on time_entries
  for select using (
    company_id = auth.company_id()
    and (auth.is_owner() or worker_id = auth.uid())
  );
create policy "time_entries self insert" on time_entries
  for insert with check (
    company_id = auth.company_id()
    and worker_id = auth.uid()
  );
create policy "time_entries self update" on time_entries
  for update using (
    company_id = auth.company_id()
    and (auth.is_owner() or worker_id = auth.uid())
  );

-- ─────────────────────────── Storage buckets ───────────────────────────
-- Run AFTER migration via Supabase dashboard or supabase CLI:
--   supabase storage create-bucket receipts --public=false
-- Then add a storage policy: authenticated users can upload to receipts/<company_id>/<worker_id>/...
