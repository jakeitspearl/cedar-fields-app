-- Attachments (photos + videos) for estimates.
-- Files live in the `estimate-attachments` storage bucket under
--   <company_id>/<estimate_id>/<uuid>.<ext>
-- so RLS can scope by the first path segment, same pattern as the `receipts` bucket.

create table if not exists estimate_attachments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  estimate_id uuid not null references estimates(id) on delete cascade,
  uploader_id uuid references profiles(id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null default 'other',     -- 'image' | 'video' | 'other'
  width int,
  height int,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists estimate_attachments_estimate_id_idx on estimate_attachments(estimate_id);
create index if not exists estimate_attachments_company_id_idx on estimate_attachments(company_id);

alter table estimate_attachments enable row level security;

create policy "estimate_attachments read" on estimate_attachments
  for select using (company_id = public.company_id());
create policy "estimate_attachments insert" on estimate_attachments
  for insert with check (
    company_id = public.company_id()
    and exists (select 1 from estimates e where e.id = estimate_id and e.company_id = company_id)
  );
create policy "estimate_attachments owner delete" on estimate_attachments
  for delete using (public.is_owner() and company_id = public.company_id());
create policy "estimate_attachments owner update" on estimate_attachments
  for update using (public.is_owner() and company_id = public.company_id());

-- Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estimate-attachments',
  'estimate-attachments',
  false,
  104857600,                            -- 100 MB per object
  array[
    'image/jpeg','image/png','image/heic','image/heif','image/webp','image/gif',
    'video/mp4','video/quicktime','video/webm'
  ]
)
on conflict (id) do nothing;

drop policy if exists "estimate-attachments insert" on storage.objects;
create policy "estimate-attachments insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1] = public.company_id()::text
  );

drop policy if exists "estimate-attachments read" on storage.objects;
create policy "estimate-attachments read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1] = public.company_id()::text
  );

drop policy if exists "estimate-attachments delete by owner" on storage.objects;
create policy "estimate-attachments delete by owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estimate-attachments'
    and (storage.foldername(name))[1] = public.company_id()::text
    and public.is_owner()
  );
