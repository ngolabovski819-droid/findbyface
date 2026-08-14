# Search Stories launch checklist

The code is intentionally fail-closed until its database schema and secrets exist. Complete
these steps before deploying the feature.

## 1. Database

Run `scripts/migrations/024_finder_comments.sql` in the production Supabase SQL editor. The
migration creates service-role-only tables, one-level reply and moderation guards, anonymous
Helpful/Report counters, verification-draft claiming, and retention cleanup.

Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Keep `SUPABASE_KEY` for the existing application
only if required; comment storage always prefers the explicit service-role variable.

## 2. Secrets and mail

Add these production environment variables in Vercel:

- `SEARCH_STORY_SECRET`: preferably at least 32 random bytes; signs short-lived completed-search
  proofs. If omitted, the app derives a purpose-specific subkey from the existing strong
  `CLICK_TOKEN_SECRET` so a release cannot silently leave the composer locked.
- `COMMENT_PRIVACY_SECRET`: preferably a different value of at least 32 random bytes; one-way separates
  private feedback IDs, comment replay IDs, IP rate-limit keys, and browser vote/report keys.
  If omitted, the app derives a separate purpose-specific subkey from `SEARCH_STORY_SECRET` or
  `CLICK_TOKEN_SECRET`.
- `PUBLIC_SITE_URL=https://findbyface.org`
- `COMMENT_EMAIL_FROM`: optional override for the verified Resend sender. Production defaults to
  `FindByFace Search Stories <community@findbyface.org>`.
- `COMMENT_MODERATION_EMAIL`: the private inbox that should receive the once-daily queue digest;
  falls back to the existing `CONTACT_NOTIFY_EMAIL`.
- `CRON_SECRET`: a long random Vercel Cron bearer secret.
- Existing `RESEND_API_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY` must remain
  configured. Turnstile protects guest email submission; safety reports deliberately remain
  low-friction and are protected with a honeypot, per-IP limit, and one-browser-per-comment rule.

Do not reuse a Supabase key or password as any of these secrets. Redeploy after adding them.

## 3. Secure panel-role migration

Panel authorization now reads Supabase `app_metadata`, which ordinary users cannot edit. The
old `user_metadata.panel_role` field is no longer trusted. Re-run the provisioning script once
for every admin and guest panel login before deployment:

```text
node scripts/provision_panel_user.mjs --email=admin@findbyface.org --role=admin --name="Nick"
```

For guest accounts, include every permitted model with `--client=slug,second-slug`. Supplying no
`--password` preserves an existing account password. The script also removes legacy role/client
fields from user-editable metadata.

## 4. Acceptance test

Test both dedicated finder pages in a production-like preview:

1. Confirm Search Stories are readable before signing in and appear in the server HTML.
2. Confirm the composer stays locked until a real face search completes.
3. Submit Found/Close/Not yet without commenting and verify only aggregate feedback is stored.
4. Submit a guest story and reply, open each email link twice, and verify only one pending row is
   created. Confirm email, proof IDs, and uploaded/search data never appear in public API output.
5. Submit while signed in and confirm it also enters `pending` rather than publishing directly.
6. Toggle Helpful while signed out, refresh, toggle it off, and confirm no email/search is needed.
7. Report a comment and confirm it appears under Reported in the admin queue.
8. On desktop and mobile widths, approve/reject/remove/restore a story and a reply. Confirm only
   approved content appears publicly and neutral emails contain no creator or adult-search details.
9. Confirm `/panel/comments/` and its API return 403 for a panel guest.
10. Invoke the maintenance endpoint with Vercel's Cron authorization and verify expired drafts are
    removed and a digest is sent only when work is waiting.

The maintenance job is scheduled once daily at 08:00 UTC (Vercel Hobby may invoke it within that
hour rather than at the exact minute). Expired unverified drafts receive a 24-hour delivery grace
period; consumed drafts remain for seven days so repeated email-link opens are idempotent, then the
full private draft and email copy are deleted.
