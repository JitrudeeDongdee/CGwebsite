-- TDD — initial schema.
--
-- Mirrors the TypeScript types the app already uses:
--   src/catalog/types.ts   -> products, projects
--   src/leads/types.ts     -> leads
--   src/pricing/types.ts   -> price_config
-- Bilingual fields are jsonb `{"th": "...", "en": "..."}` so they map 1:1 onto
-- the `Localized` type instead of needing two columns each.
--
-- Run once in Supabase → SQL Editor. Safe to re-run: everything is IF NOT EXISTS
-- / CREATE OR REPLACE, and policies are dropped before being recreated.

-- ---------------------------------------------------------------------------
-- who is staff
-- ---------------------------------------------------------------------------

-- Roles live in a table, never in client state: a browser can claim anything.
-- `role` is NULL by default, which means "signed in but no access" — a new
-- account must be granted a role deliberately, by an existing admin or in SQL.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- A row appears for every new auth user, with NO role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Used by every write policy below. SECURITY DEFINER so the policy can read
-- profiles without the caller needing select rights on it — and STABLE so it is
-- evaluated once per statement, not once per row.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- ---------------------------------------------------------------------------
-- catalog
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  category    text not null check (category in ('house', 'electronics', 'furniture', 'rental')),
  name        jsonb not null,          -- {th, en}
  short_desc  jsonb not null default '{"th":"","en":""}'::jsonb,
  price_from  numeric,                 -- NULL = quote only
  price_unit  jsonb,                   -- e.g. {"th":"ต่อวัน","en":"per day"}; NULL for one-off prices
  specs       jsonb not null default '[]'::jsonb,   -- [{label:{th,en}, value:{th,en}}]
  featured    boolean not null default false,
  best_seller boolean not null default false,
  -- Draft by default. Nothing reaches the public site until someone publishes it
  -- on purpose — the opposite default would leak half-written rows.
  published   boolean not null default false,
  sort_order  integer not null default 0,
  image_path  text,                    -- storage object path; falls back to /products/<slug>.jpg
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       jsonb not null,
  location    jsonb not null default '{"th":"","en":""}'::jsonb,
  year        text,                    -- shown as-is, Buddhist era e.g. "2567"
  category    text not null check (category in ('house', 'electronics', 'furniture', 'rental')),
  area        text,
  description jsonb not null default '{"th":"","en":""}'::jsonb,
  featured    boolean not null default false,
  published   boolean not null default false,
  sort_order  integer not null default 0,
  image_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category) where published;
create index if not exists projects_category_idx on public.projects (category) where published;

-- ---------------------------------------------------------------------------
-- customer-submitted data
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  email      text,
  province   text,
  timeline   text,
  status     text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  -- Frozen copy of the plan as submitted, not a reference: sales must see what
  -- the customer actually sent, even if the customer keeps editing afterwards.
  plan       jsonb,
  grade      text check (grade in ('economy', 'standard', 'premium')),
  estimate   jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  message    text,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pricing — one row, so the rates stop being per-browser localStorage
-- ---------------------------------------------------------------------------

create table if not exists public.price_config (
  id            boolean primary key default true check (id),  -- forces a single row
  currency      text not null default 'THB',
  price_per_sqm jsonb not null,   -- {economy, standard, premium}
  opening_price jsonb not null,   -- {door, window}
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
drop trigger if exists price_config_touch on public.price_config;
create trigger price_config_touch before update on public.price_config
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — this is the real security boundary, not the admin UI
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.products         enable row level security;
alter table public.projects         enable row level security;
alter table public.leads            enable row level security;
alter table public.contact_messages enable row level security;
alter table public.price_config     enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());

-- Catalog: the public sees published rows only; staff see and change everything.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (published or public.is_staff());
drop policy if exists products_staff_write on public.products;
create policy products_staff_write on public.products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon, authenticated using (published or public.is_staff());
drop policy if exists projects_staff_write on public.projects;
create policy projects_staff_write on public.projects
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Leads and messages: anyone may submit, ONLY staff may read. Without the
-- read restriction every visitor could dump the customer list.
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert to anon, authenticated with check (true);
drop policy if exists leads_staff_read on public.leads;
create policy leads_staff_read on public.leads
  for select to authenticated using (public.is_staff());
drop policy if exists leads_staff_write on public.leads;
create policy leads_staff_write on public.leads
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists messages_public_insert on public.contact_messages;
create policy messages_public_insert on public.contact_messages
  for insert to anon, authenticated with check (true);
drop policy if exists messages_staff_read on public.contact_messages;
create policy messages_staff_read on public.contact_messages
  for select to authenticated using (public.is_staff());
drop policy if exists messages_staff_write on public.contact_messages;
create policy messages_staff_write on public.contact_messages
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Prices are shown on the public site, so anyone may read them; only staff set them.
drop policy if exists price_public_read on public.price_config;
create policy price_public_read on public.price_config
  for select to anon, authenticated using (true);
drop policy if exists price_staff_write on public.price_config;
create policy price_staff_write on public.price_config
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
