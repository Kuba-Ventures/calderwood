# Password reset: how the recovery link is built, and how to keep it working

> **Current state (Oct 2026):** the apex `https://newfeeschedule.com` is the
> primary host. `www` and `http://` 308 to it. `NEXT_PUBLIC_SITE_URL` is the
> apex. The NXDOMAIN history below is kept for context.

Symptom that used to recur: a user clicks **Reset Password** in the email and
lands on a dead page. The address bar shows something like

```
https://newfeeschedule.com/?code=94dcaa16-...   ->  DNS_PROBE_FINISHED_NXDOMAIN
```

The link pointed at the bare apex `newfeeschedule.com`, which did not resolve
at the time (only `www` was live). Because the request never reaches the
app, the middleware that forwards `/?code=...` to `/reset-password` (issue #45,
PR #46) never runs. So the code path is fine; the **link host** is wrong.

## Why the link uses the wrong host

Supabase builds the recovery link from one of two places:

1. The `redirectTo` we pass in `resetPasswordForEmail(...)` **if and only if**
   that exact URL is in the dashboard **Redirect URLs** allow-list.
2. Otherwise it falls back to the project **Site URL**.

If the requested `redirectTo` is not allow-listed, the link falls back to the
Site URL, which may be a different host than the one the user is on.

The app code now pins `redirectTo` to the canonical origin
(`NEXT_PUBLIC_SITE_URL`), not `window.location.origin` (see
`lib/site-url.ts` and `app/forgot-password/forgot-password-client.tsx`). That
removes the "whichever host the user was on" variable, but it only takes effect
once the two settings below are correct. Code alone cannot fix this.

## The fix (config, done once)

### 1. Supabase dashboard - Authentication -> URL Configuration

- **Site URL**: `https://newfeeschedule.com`
- **Redirect URLs** allow-list, add:
  - `https://newfeeschedule.com/reset-password`
  - `https://newfeeschedule.com/**` (covers other flows)
  - Keep the `www` entries too; `www` 308s to the apex with the query intact.

  Keep these in sync with whatever `NEXT_PUBLIC_SITE_URL` is set to.

### 2. Vercel env

- `NEXT_PUBLIC_SITE_URL=https://newfeeschedule.com`
  Set for Production (and Preview if reset is tested there). Redeploy so the
  value is inlined into the client bundle.

### 3. DNS / domains (belt and suspenders)

- Done: the apex is the primary Vercel domain and `www` 308-redirects to it,
  so old `www` links still land on a live host.

## How to verify

1. `NEXT_PUBLIC_SITE_URL` is set in Vercel Production and a fresh deploy has
   shipped.
2. Trigger a reset from `/forgot-password`.
3. In the email, the **Reset Password** link host is `newfeeschedule.com`
   and the path is `/reset-password` (or `/?code=...`, which the middleware
   forwards). It must load directly.
4. The `/reset-password` page reaches the "Choose a new password" form.

## Related code

- `lib/site-url.ts` - canonical origin helper used to build `redirectTo`.
- `app/forgot-password/forgot-password-client.tsx` - sends the recovery email.
- `app/reset-password/*` - consumes the recovery session, sets the new password.
- `middleware.ts` + `lib/auth/recovery-redirect.ts` - forward a root
  `/?code=...` hit to `/reset-password` (only fires if the host resolves).
