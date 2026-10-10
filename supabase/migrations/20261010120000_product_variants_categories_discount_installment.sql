-- Products gain four things, all additive so existing rows keep working:
--   extra_categories  a product can also appear under other category filters /
--                     service home pages, while `category` stays its primary one
--                     (the URL, best-seller-per-category and admin table still use it)
--   installment       a simple on/off "can be paid in instalments" flag
--   discount          an optional price cut, by baht amount or percent, with an
--                     optional start/end window (null ends = open-ended / always on):
--                     { "kind": "amount"|"percent", "value": number,
--                       "start": iso|null, "end": iso|null }
--   variants          models/sizes of one product, each with its own price and
--                     photos: [{ id, name:{th,en}, priceFrom:number|null,
--                     priceUnit:{th,en}|null, images:text[] }]
alter table public.products
  add column if not exists extra_categories text[] not null default '{}',
  add column if not exists installment boolean not null default false,
  add column if not exists discount jsonb,
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- Keep extra_categories to the same set the `category` CHECK allows. `<@` means
-- "every element is one of these", and the empty default array trivially passes.
alter table public.products drop constraint if exists products_extra_categories_check;
alter table public.products
  add constraint products_extra_categories_check
  check (extra_categories <@ array['house','electronics','furniture','rental','contracting']::text[]);
