# Database workflow

The schema is **code**, not something you click together in the dashboard. Every
change is a file in `migrations/`, committed and reviewed like any other diff.

## One-time setup (per machine)

```bash
pnpm exec supabase login                       # opens the browser; stores an access token
pnpm exec supabase link --project-ref xiomhpuoewqvxvkqfure
```

`link` asks for the database password — the one set when the project was created.
It is stored by the CLI, never in this repo.

The first migration (`20260906130000_init.sql`) was applied by hand in the SQL
Editor before the CLI existed, so the remote has the tables but no migration
history. Fix that with one push:

```bash
pnpm run db:push        # applies anything the remote hasn't recorded
```

Re-applying `init` is safe: every statement in it is `create ... if not exists`
or `drop policy if exists` + `create policy`, so it converges instead of failing.

## Changing the schema

```bash
pnpm run db:new add_product_gallery     # creates migrations/<timestamp>_add_product_gallery.sql
# write the SQL, commit it
pnpm run db:push                        # apply to the remote
pnpm run db:status                      # local vs remote, side by side
```

## If someone edits the schema in the dashboard anyway

That is drift — the remote no longer matches `migrations/`. Capture it instead of
arguing about it:

```bash
pnpm run db:diff captured_dashboard_change   # writes the difference as a new migration
```

Then commit that file, so the next person's `db:push` reproduces it.

## Rules

- **Never edit an applied migration.** It has already run on the remote; changing
  the file changes only history, not the database. Write a new one.
- **A migration that drops or renames a column is not reversible.** On the free
  tier there are no backups, so run the backup workflow
  (`.github/workflows/supabase-backup.yml`, needs the `SUPABASE_DB_URL` secret)
  before pushing one — and treat it as a MAJOR version bump per the SemVer rules
  in the root instructions.
- **`db push` targets production directly.** There is no staging project. Read
  the SQL you are about to push; a `db:status` first costs nothing.
- RLS is part of the schema. A new table starts with **no** access until a policy
  says otherwise — write the policies in the same migration as the table, never
  "later".
