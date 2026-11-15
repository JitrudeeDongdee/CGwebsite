-- Saved house plans, so a design outlives the browser that drew it.
--
-- `/design/<uuid>` already addresses a plan by id; until now that id resolved
-- only against localStorage, so the link opened on no other machine. This is
-- the table that makes it real. The app keeps the localStorage repository as
-- the fallback it uses when Supabase is not configured, and until this
-- migration has been applied — so deploying the code before running this
-- changes nothing a customer sees.
--
-- Additive only (one new table). Safe to re-run.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  -- Who may open it. NOT NULL, and it is the whole access rule: a plan with
  -- no owner would be readable by the policy of whoever asked first.
  owner uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  -- Every storey, ground floor first — the `DrawingState[]` the editor holds.
  floors jsonb not null default '[]'::jsonb,
  -- The 3D finishes it was last seen in. A house reopened in the default
  -- plaster and tile is not the house that was saved.
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plans is
  'House designs saved from /design. Owned by the account that saved them; staff may read for support.';

-- Listing is always "my plans, newest first".
create index if not exists plans_owner_updated_idx
  on public.plans (owner, updated_at desc);

drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

alter table public.plans enable row level security;

-- A customer's own designs, and nobody else's. `owner` is checked on write as
-- well as read: without the `with check`, a signed-in account could insert a
-- row owned by someone else and then be unable to see what it had created.
drop policy if exists plans_owner_all on public.plans;
create policy plans_owner_all on public.plans
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Staff may READ, so the team can open a design a customer is asking about.
-- Deliberately read-only: nobody on the team should be able to edit, or
-- silently delete, a customer's drawing.
drop policy if exists plans_staff_read on public.plans;
create policy plans_staff_read on public.plans
  for select to authenticated
  using (public.is_staff());
