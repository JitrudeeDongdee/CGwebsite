-- A contact-form message now carries a subject (a chosen topic plus an optional
-- free-text detail, e.g. "สอบถามราคาสินค้า — ตู้เย็น"). Additive and nullable so
-- existing rows and an un-migrated DB keep working.
alter table public.contact_messages add column if not exists subject text;
