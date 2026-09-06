-- Catalog images move out of the repo and into Storage.
--
-- Until now every product/portfolio photo was a file in public/, so adding one
-- job to the portfolio meant a commit and a redeploy. This bucket holds them
-- instead; the app resolves the SAME relative path (`portfolio/<slug>.jpg`)
-- through Storage when Supabase is configured, and through public/ when it
-- isn't (src/supabase/storage.ts), so a checkout with no Supabase project still
-- renders the committed seed images.
--
-- PUBLIC bucket on purpose: these are marketing photos meant to be seen by
-- anyone, and a public object needs no signed URL — one plain <img src> per
-- image instead of a round trip to mint a token. Nothing private goes in here.
-- Writes stay locked to staff by the policies below.
--
-- Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog',
  'catalog',
  true,
  10485760,  -- 10 MB: the import script resizes to ~1600px, well under this.
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read: anyone, including logged-out visitors — that's the point of the bucket.
drop policy if exists "catalog images are public" on storage.objects;
create policy "catalog images are public"
  on storage.objects for select
  using (bucket_id = 'catalog');

-- Write: staff only, reusing the role check from the init migration. The anon
-- key in the browser therefore cannot upload or delete, even though it can read.
drop policy if exists "staff upload catalog images" on storage.objects;
create policy "staff upload catalog images"
  on storage.objects for insert
  with check (bucket_id = 'catalog' and public.is_staff());

drop policy if exists "staff update catalog images" on storage.objects;
create policy "staff update catalog images"
  on storage.objects for update
  using (bucket_id = 'catalog' and public.is_staff())
  with check (bucket_id = 'catalog' and public.is_staff());

drop policy if exists "staff delete catalog images" on storage.objects;
create policy "staff delete catalog images"
  on storage.objects for delete
  using (bucket_id = 'catalog' and public.is_staff());

comment on column public.products.image_path is
  'Path inside the "catalog" Storage bucket, e.g. products/studio-6x4.jpg. NULL means the products/<slug>.jpg convention.';
comment on column public.projects.image_path is
  'Path inside the "catalog" Storage bucket, e.g. portfolio/ban-chaiyaphum-2f.jpg. NULL means the portfolio/<slug>.jpg convention.';
