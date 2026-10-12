-- A contact-form message now carries a subject (a chosen topic plus an optional
-- free-text detail, e.g. "สอบถามราคาสินค้า — ตู้เย็น") and, optionally, the
-- company/organisation the sender is contacting on behalf of. Additive and
-- nullable so existing rows and an un-migrated DB keep working.
alter table public.contact_messages add column if not exists subject text;
alter table public.contact_messages add column if not exists organization text;
