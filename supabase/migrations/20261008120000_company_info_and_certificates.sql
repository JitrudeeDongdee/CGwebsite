-- Company registration facts and trust documents, editable from the back office.
--
-- Until now the legal block on /about was a TypeScript constant
-- (src/content/company.ts), so correcting a capital figure meant a commit and a
-- redeploy. Both tables below are read by the public site and written by staff;
-- company.ts stays as the fallback the site renders when this migration has not
-- been applied yet or the fetch fails.
--
-- Additive only (two new tables, one new bucket): rolling back the app needs no
-- schema change. Safe to re-run.

-- ---------------------------------------------------------------------------
-- company_info — exactly one row
-- ---------------------------------------------------------------------------
-- A single-row table rather than a key/value store, so every field has a type
-- and a column name the admin form can rely on. `id = 1` is enforced, so a second
-- row can never appear and leave the site guessing which one is current.
create table if not exists public.company_info (
  id smallint primary key default 1 check (id = 1),
  legal_name jsonb not null default '{"th":"","en":""}'::jsonb,
  registration_no text not null default '',
  registered_on date,
  capital numeric,
  status jsonb not null default '{"th":"","en":""}'::jsonb,
  business_type jsonb not null default '{"th":"","en":""}'::jsonb,
  activities jsonb not null default '{"th":"","en":""}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.company_info is
  'The one row of company registration facts shown on /about. Values must match the DBD หนังสือรับรอง.';

-- Seeded with what company.ts already shows (taken from the DBD registration),
-- so applying this changes nothing a visitor sees. `do nothing` keeps a re-run
-- from overwriting edits made in the back office since.
insert into public.company_info (id, legal_name, registration_no, registered_on, capital, status, business_type, activities)
values (
  1,
  '{"th":"ห้างหุ้นส่วนจำกัด ไทย ดวงดี เอ็นจิเนียริ่ง","en":"Thai Dongdee Engineering Limited Partnership"}',
  '0673560001671',
  '2017-11-10',
  1500000,
  '{"th":"ยังดำเนินกิจการอยู่","en":"Active"}',
  '{"th":"ร้านขายปลีกเครื่องใช้ไฟฟ้าชนิดในครัวเรือน","en":"Retail of household electrical appliances"}',
  '{"th":"ขายเครื่องใช้ไฟฟ้า อุปกรณ์ก่อสร้าง ติดตั้ง จัดทำ ซ่อมบำรุง","en":"Sale of electrical appliances and construction equipment; installation, fabrication and maintenance"}'
)
on conflict (id) do nothing;

drop trigger if exists company_info_touch on public.company_info;
create trigger company_info_touch before update on public.company_info
  for each row execute function public.touch_updated_at();

alter table public.company_info enable row level security;

drop policy if exists company_info_public_read on public.company_info;
create policy company_info_public_read on public.company_info
  for select to anon, authenticated using (true);

-- UPDATE only: the row is created above, and deleting it would blank the legal
-- block on the live site.
drop policy if exists company_info_staff_update on public.company_info;
create policy company_info_staff_update on public.company_info
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- certificates — licences, registrations, awards shown on /about
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  issuer jsonb,
  -- The document's own number (licence no., certificate no.), shown as-is.
  doc_no text,
  issued_on date,
  -- An expired document is hidden from the public page automatically: an
  -- out-of-date licence on a trust section does more harm than none.
  expires_on date,
  -- Path inside the "documents" bucket.
  file_path text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.certificates is
  'Trust documents (licences, registrations, certificates) shown on /about. Files live in the "documents" bucket.';

drop trigger if exists certificates_touch on public.certificates;
create trigger certificates_touch before update on public.certificates
  for each row execute function public.touch_updated_at();

alter table public.certificates enable row level security;

drop policy if exists certificates_public_read on public.certificates;
create policy certificates_public_read on public.certificates
  for select to anon, authenticated using (published or public.is_staff());

drop policy if exists certificates_staff_write on public.certificates;
create policy certificates_staff_write on public.certificates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- documents bucket — scans and PDFs of the certificates
-- ---------------------------------------------------------------------------
-- Separate from "catalog" because that bucket only accepts images, and a
-- licence is usually a PDF. PUBLIC like catalog: these files exist to be shown.
-- An UNPUBLISHED certificate's file is therefore still readable by anyone who
-- has its URL (the path carries a random stamp, so it is not guessable) — do not
-- upload anything that must stay private, e.g. a page showing an ID card number.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents are public" on storage.objects;
create policy "documents are public"
  on storage.objects for select
  using (bucket_id = 'documents');

drop policy if exists "staff upload documents" on storage.objects;
create policy "staff upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and public.is_staff());

drop policy if exists "staff update documents" on storage.objects;
create policy "staff update documents"
  on storage.objects for update
  using (bucket_id = 'documents' and public.is_staff())
  with check (bucket_id = 'documents' and public.is_staff());

drop policy if exists "staff delete documents" on storage.objects;
create policy "staff delete documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and public.is_staff());
