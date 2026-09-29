# BOBSF

The members-only website for Band of Brothers Sisters and Friends. It has a calendar, forums, and a member directory grouped by branch. It's built so it can become iPhone and Android apps later.

## What's here

| Feature | Where |
| --- | --- |
| Signup; only admins approve new members | `/signup`, `/admin` |
| Member directory by branch, with badges and privacy settings | `/members`, `/profile` |
| Public forum, plus a private forum for each group | `/forums` |
| Email to people following a discussion when someone replies | `src/lib/notify.ts` |
| Calendar with RSVPs and "add to my calendar" | `/events` |
| Bulk email: leaders to their group, admins to everyone | `/email` |
| Moderation: hide posts, lock or pin threads, reported posts, suspend | thread pages, `/admin` |
| Account deletion, privacy policy, code of conduct | `/profile`, `/privacy`, `/terms` |

The privacy rules (who can see names, contact info, forums and events) are enforced by the database itself, in `supabase/migrations/`. The web pages only display what the database allows.

### Roles

- **Member:** sees their own group, plus anyone who chose to be visible to all members. Posts in the public forum and their group's forum.
- **Group leader:** everything a member can do, plus seeing contact info for their group, emailing their group, adding events for their group, and moderating their group's forum.
- **Admin:** sees everything, approves registrations, manages roles, and emails everyone.
- **Friends:** a group like the branches, for members who aren't veterans.

## Tech

- Next.js 16 (React, TypeScript, Tailwind), hosted on Vercel
- Supabase for the Postgres database, logins and photo storage
- Postmark for email
- The phone apps (later) will use Expo and share the same Supabase backend

## Going live (one-time setup)

1. **Supabase:** create a project at supabase.com. In the SQL editor, run `supabase/migrations/20260929000000_init.sql`.
2. **Supabase auth settings:**
   - Under Authentication > URL Configuration, set the Site URL to your domain and add `https://YOUR-DOMAIN/auth/confirm` as a redirect URL.
   - Keep "Confirm email" turned on.
3. **Postmark:** create a server and a "broadcast" message stream. Verify your domain, which sets up SPF, DKIM and a Return-Path. Also add a DMARC record at your domain registrar.
4. **Vercel:** import this repository and add the environment variables from `.env.example`.
5. **First admin:** sign up on the live site, then run this in the Supabase SQL editor:
   ```sql
   update public.profiles set status = 'approved', role = 'admin' where email = 'you@example.com';
   ```
   After that, everything else is done from the Admin page. Make a second admin so you can never be locked out.

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase keys
npm install
npm run dev
```

Without `POSTMARK_SERVER_TOKEN`, emails are printed to the terminal instead of sent.

### Database tests

`supabase/tests/privacy_test.sql` checks the privacy rules, for example that a Navy member can't see an Army member's group-only details and that a Friend can't post in a branch forum. Run it against a database with the migration applied. The test runs inside a transaction and changes nothing.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/privacy_test.sql
```

To run the tests on plain Postgres without Supabase, apply `supabase/tests/supabase_stub.sql` first:

```bash
createdb bobsf_test
psql -d bobsf_test -v ON_ERROR_STOP=1 -f supabase/tests/supabase_stub.sql \
  -f supabase/migrations/20260929000000_init.sql -f supabase/tests/privacy_test.sql
```
