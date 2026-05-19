-- Auto-bootstrap on signup + seed demo data + storage bucket policies.
-- After running migration 00001, run this one second.

-- ─────────────────────────── Signup trigger ───────────────────────────
-- When a user signs up via Supabase auth, automatically:
--   1. Create a Company for them
--   2. Create an owner Profile linking them to that Company
--   3. Seed demo clients / estimates / jobs / receipts so the UI has data to show
--
-- This makes /signup → /admin a one-step experience. Workers are added later by
-- the owner from the dashboard (or manually via SQL during this preview phase).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  user_name text;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid;
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    initcap(split_part(new.email, '@', 1))
  );

  insert into companies (name, owner_id)
  values ('Cedar Fields Landscaping', new.id)
  returning id into new_company_id;

  insert into profiles (id, company_id, role, full_name)
  values (new.id, new_company_id, 'owner', user_name);

  -- Seed demo clients
  insert into clients (id, company_id, name, phone, email, address, initials) values
    (uuid_generate_v4(), new_company_id, 'Peggy Thornton',     '(631) 555-0142', 'peggy.t@mail.com',         '14 Ridge Rd, Southold',         'PT'),
    (uuid_generate_v4(), new_company_id, 'Mike Delgado',       '(631) 555-0188', 'mike.d@mail.com',          '212 Beach Ln, Southampton',     'MD'),
    (uuid_generate_v4(), new_company_id, 'Johnson Property',   '(631) 555-0106', 'dj@johnsonhomes.com',      '47 Oak Ave, Cutchogue',         'JP'),
    (uuid_generate_v4(), new_company_id, 'Sarah Whitaker',     '(631) 555-0231', 'swhitaker@mail.com',       '9 Dune Path, Sag Harbor',       'SW'),
    (uuid_generate_v4(), new_company_id, 'Tom & Linda Rourke', '(631) 555-0119', 'trourke@mail.com',         '88 Main St, Greenport',         'TR'),
    (uuid_generate_v4(), new_company_id, 'Vineyard Estate LLC','(631) 555-0173', 'ops@vineyardestate.com',   '301 Sound Ave, Mattituck',      'VE');

  -- Look up client ids we just inserted
  select id into c1 from clients where company_id = new_company_id and name = 'Peggy Thornton';
  select id into c2 from clients where company_id = new_company_id and name = 'Mike Delgado';
  select id into c3 from clients where company_id = new_company_id and name = 'Johnson Property';
  select id into c4 from clients where company_id = new_company_id and name = 'Sarah Whitaker';
  select id into c5 from clients where company_id = new_company_id and name = 'Tom & Linda Rourke';
  select id into c6 from clients where company_id = new_company_id and name = 'Vineyard Estate LLC';

  -- Seed estimates
  insert into estimates (id, company_id, client_id, job_description, status, labor_hours, yardage, disposal_yards)
  values
    (uuid_generate_v4(), new_company_id, c1, 'Spring Mulch Install — Front Beds',  'pending', 6,  3, 1.5),
    (uuid_generate_v4(), new_company_id, c3, 'Retaining Wall — North Slope',       'draft',  28, 0, 2),
    (uuid_generate_v4(), new_company_id, c5, 'Weekly Lawn Cut — Season Renewal',   'ready',  0,  0, 0),
    (uuid_generate_v4(), new_company_id, c2, 'Hedge Trimming — 40ft Privet',       'sent',   4,  0, 0.5),
    (uuid_generate_v4(), new_company_id, c2, 'Tick Treatment — 1st Application',   'draft',  1.5, 0, 0);

  -- Look up estimate ids
  select id into e1 from estimates where company_id = new_company_id and job_description = 'Spring Mulch Install — Front Beds';
  select id into e2 from estimates where company_id = new_company_id and job_description = 'Retaining Wall — North Slope';
  select id into e3 from estimates where company_id = new_company_id and job_description = 'Weekly Lawn Cut — Season Renewal';
  select id into e4 from estimates where company_id = new_company_id and job_description = 'Hedge Trimming — 40ft Privet';
  select id into e5 from estimates where company_id = new_company_id and job_description = 'Tick Treatment — 1st Application';

  -- Flat fee on the lawn cut estimate
  update estimates set flat_fee_cents = 168000, flat_fee_label = '26 visits × $65/visit' where id = e3;

  -- Estimate materials
  insert into estimate_materials (estimate_id, position, name, qty, unit_price_cents, tbd, tbd_note) values
    (e1, 0, 'Hardwood Mulch — 3 yd',     3,   4500, false, null),
    (e1, 1, 'Edging — Black Aluminum',   40,  0,    true,  'Pending Nursery Call'),
    (e2, 0, 'Allan Block — Charcoal',    120, 850,  false, null),
    (e2, 1, 'Crushed Stone Base',        4,   3800, false, null),
    (e4, 0, 'Disposal Bags (pro-pack)',  1,   1800, false, null),
    (e5, 0, 'Tick Killz Concentrate',    1,   0,    true,  'Pending Nursery Call');

  -- Seed jobs
  insert into jobs (company_id, client_id, kind, service, status, price_cents, frequency, next_date) values
    (new_company_id, c6, 'recurring', 'Weekly Lawn Cut',     'scheduled', 28000, 'Weekly · Tuesdays',  current_date + 5),
    (new_company_id, c3, 'recurring', 'Bi-Weekly Lawn Cut',  'scheduled', 9500,  'Bi-weekly · Fridays', current_date + 2),
    (new_company_id, c5, 'recurring', 'Weekly Lawn Cut',     'scheduled', 6500,  'Weekly · Wednesdays', current_date);

  insert into jobs (company_id, client_id, kind, service, status, price_cents, scheduled_date, notes) values
    (new_company_id, c1, 'onetime', 'Spring Mulch Install', 'scheduled',   89500,  current_date + 3, 'Access through side gate. Dog stays inside.'),
    (new_company_id, c3, 'onetime', 'Retaining Wall',       'in_progress', 485000, current_date,     'Material stacked at top of driveway. Call before arriving.'),
    (new_company_id, c2, 'onetime', 'Hedge Trimming',       'complete',    32000,  current_date - 4, 'Privet along east property line. Customer approved.');

  -- Seed invoices
  insert into invoices (company_id, client_id, estimate_id, job_reference, status, total_cents, due_label, qb_status) values
    (new_company_id, c2, e4,   'Hedge Trimming — 40ft Privet', 'paid',  31200,  'Paid ' || to_char(current_date - 4, 'Mon DD'), 'synced'),
    (new_company_id, c6, null, 'April — Weekly Cuts',          'sent',  112000, 'Due ' || to_char(current_date + 12, 'Mon DD'), 'synced'),
    (new_company_id, c5, null, 'Spring Cleanup',               'draft', 54000,  'Draft',                                        'not_synced'),
    (new_company_id, c1, null, 'Mulch Top-up — Back Bed',      'sent',  24500,  'Due ' || to_char(current_date + 7, 'Mon DD'),  'failed');

  -- Seed receipts (no worker_id yet — owner is the only user; can re-assign later)
  insert into receipts (company_id, worker_id, client_id, vendor, amount_cents, category, occurred_on) values
    (new_company_id, new.id, c3,   'Peconic Nursery',          38422,  'materials', current_date),
    (new_company_id, new.id, null, 'Shell — Riverhead',        6840,   'gas',       current_date),
    (new_company_id, new.id, c1,   'Home Depot — Calverton',   11287,  'materials', current_date - 1),
    (new_company_id, new.id, c2,   'Town Dump — Southold',     4200,   'disposal',  current_date - 2),
    (new_company_id, new.id, null, 'BP — Mattituck',           7410,   'gas',       current_date - 3),
    (new_company_id, new.id, c3,   'Long Island Stone Supply', 124800, 'materials', current_date - 4);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── Storage bucket ───────────────────────────

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Path layout: receipts/<company_id>/<worker_id>/<uuid>.jpg
-- The first path segment must match the user's company_id.

drop policy if exists "receipts upload by company member" on storage.objects;
create policy "receipts upload by company member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.company_id()::text
  );

drop policy if exists "receipts read by company member" on storage.objects;
create policy "receipts read by company member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.company_id()::text
  );

drop policy if exists "receipts delete by owner" on storage.objects;
create policy "receipts delete by owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.company_id()::text
    and auth.is_owner()
  );
