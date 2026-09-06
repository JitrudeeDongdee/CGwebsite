-- Add the 'contracting' (งานรับเหมาทั่วไป — general contracting, e.g. fiber-optic
-- cabling) category to the products/projects CHECK constraints. The inline checks
-- from the init migration are named <table>_category_check by Postgres.

alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check
  check (category in ('house', 'electronics', 'furniture', 'rental', 'contracting'));

alter table public.projects drop constraint if exists projects_category_check;
alter table public.projects
  add constraint projects_category_check
  check (category in ('house', 'electronics', 'furniture', 'rental', 'contracting'));
