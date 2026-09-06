-- Portfolio items are written up in our own words and our own images; this only
-- records where the work was first posted (a Facebook post), so the detail page
-- can link back to it. Nothing on the site reads content from that URL — see the
-- "portfolio from Facebook" note in spec.md for why importing beats scraping.
alter table public.projects
  add column if not exists source_url text;

comment on column public.projects.source_url is
  'Optional link to the original post (e.g. a public Facebook post). Display-only.';
