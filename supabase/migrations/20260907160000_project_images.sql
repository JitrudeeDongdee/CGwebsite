-- Several photos per project, not one.
--
-- `image_path` stays as it is (the cover, and what older rows already have);
-- `images` holds the full gallery in display order, cover first. Keeping both
-- means nothing that reads image_path breaks, and a row with no gallery yet
-- still renders its single photo.
alter table public.projects
  add column if not exists images text[] not null default '{}';

comment on column public.projects.images is
  'Ordered gallery: paths inside the "catalog" Storage bucket. images[1] is the cover; image_path mirrors it for older readers.';

-- Products get the same treatment so the two catalog types stay symmetrical.
alter table public.products
  add column if not exists images text[] not null default '{}';
