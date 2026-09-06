-- A job is often the delivery of something we sell: the fibre-optic cabling in a
-- portfolio piece is the same service listed under products. Linking them lets a
-- visitor go from "you did this" to "you can do this for me".
--
-- By id, not slug: a slug is a display choice and can be edited.
alter table public.projects
  add column if not exists product_id uuid references public.products (id) on delete set null;

comment on column public.projects.product_id is
  'Optional: the product/service this job delivered. Cleared automatically if that product is deleted.';

create index if not exists projects_product_idx on public.projects (product_id) where published;
