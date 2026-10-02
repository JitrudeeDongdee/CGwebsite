-- Let an admin grant and revoke roles from the back office, instead of every
-- staffing change needing someone with the service-role key and a SQL editor.
--
-- What this migration does NOT do is grant anyone a role. Who works here is
-- DATA, not schema: putting an employee's e-mail in a migration would commit it
-- to git forever, replay it into every environment including other developers'
-- machines, and make "someone joined" a code change and a redeploy.
--
-- Bootstrapping stays manual, once, because of the chicken-and-egg: only an
-- admin can appoint an admin, and at the start there is none. Run this by hand
-- after creating the first account in the dashboard:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Safe to re-run.

-- Same shape as is_staff(): SECURITY DEFINER so a policy can consult profiles
-- without the caller holding select rights on it, STABLE so it is evaluated
-- once per statement rather than once per row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the caller is an admin. Admins manage roles; staff only manage content.';

-- An admin may change anybody''s role.
--
-- Two guards in the WITH CHECK, and both earn their place:
--
--   1. `id <> auth.uid()` — an admin cannot change their OWN row. The failure
--      this prevents is a sole admin demoting themselves, which locks every
--      human out of role management permanently: nobody left can grant the role
--      back, and recovery needs the service key. Making it impossible to do
--      from the UI is cheaper than detecting it afterwards.
--   2. the role must be 'admin', 'staff' or NULL — the column CHECK already
--      says so, but repeating it here means a bad value is refused as a policy
--      violation rather than a constraint error surfacing in someone's face.
--
-- Deliberately no INSERT or DELETE policy: profile rows are created by the
-- on_auth_user_created trigger and removed by the cascade from auth.users, so
-- the only thing a human should ever change here is the role.
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (
    public.is_admin()
    and id <> auth.uid()
    and (role is null or role in ('admin', 'staff'))
  );

comment on table public.profiles is
  'One row per auth user. `role` NULL = signed in with no back-office access. '
  'Admins change roles through /admin/users; the first admin is set by hand in SQL.';
