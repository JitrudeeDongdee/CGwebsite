-- A project is often documented across several posts — start of work, progress,
-- handover. `sources` keeps them in order so the site can show them as a
-- timeline instead of a single "original post" link.
--
-- Shape: [{"url": "https://...", "label": "ลงเสาเข็ม"}] — label optional.
-- `source_url` stays as the first link so anything reading it keeps working.
alter table public.projects
  add column if not exists sources jsonb not null default '[]'::jsonb;

comment on column public.projects.sources is
  'Ordered [{url,label?}] of the posts documenting this job. sources[0].url mirrors source_url.';
