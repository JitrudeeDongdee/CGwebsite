-- A "kind" discriminator on the projects table so one table can hold two kinds
-- of content that are shown in different places:
--   'project'   = portfolio work (house / electronics / furniture / rental /
--                 contracting) — the /portfolio pages and each service home.
--   'community' = ผลงานสาธารณประโยชน์และการบริจาค (public-benefit works &
--                 donations) — shown on /home/house and the /community page,
--                 never in the product/portfolio listings. `category` is unused
--                 for these rows (kept only because the column is NOT NULL).
--
-- Existing rows default to 'project', so nothing already published moves.
alter table public.projects
  add column if not exists kind text not null default 'project'
  check (kind in ('project', 'community'));

create index if not exists projects_kind_idx on public.projects (kind) where published;

comment on column public.projects.kind is
  'project = portfolio work (uses category); community = public-benefit / donation activity (category unused, shown apart).';
