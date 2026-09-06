-- The slug becomes a display choice, not the identity.
--
-- `id` (uuid) already identifies a row; making `slug` nullable means it can be
-- edited, or left empty, without the row changing identity — the site then falls
-- back to the id in the URL. UNIQUE stays: Postgres allows any number of NULLs
-- in a unique index, so several rows can be slug-less at once.
alter table public.projects alter column slug drop not null;
alter table public.products alter column slug drop not null;

comment on column public.projects.slug is
  'Optional pretty URL segment. NULL means the site uses the row id in the URL instead.';
