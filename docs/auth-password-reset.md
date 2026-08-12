# Password reset: how the recovery link is built, and how to keep it working

Symptom that keeps recurring: a user clicks **Reset Password** in the email and
lands on a dead page. The address bar shows something like

```
https://newfeeschedule.com/?code=94dcaa16-...   ->  DNS_PROBE_FINISHED_NXDOMAIN
```

The link points at the bare apex `newfeeschedule.com`, which does not resolve.
Only `www.newfeeschedule.com` is live. Because the request never reaches the
app, the middleware that forwards `/?code=...` to `/reset-password` (issue #45,
PR #46) never runs. So the code path is fine; the **link host** is wrong.

## Why the link uses the wrong host

Supabase builds the recovery link from one of two places:

1. The `redirectTo` we pass in `resetPasswordForEmail(...)` **if and only if**
   that exact URL is in the dashboard **Redirect URLs** allow-list.
2. Otherwise it falls back to the project **Site URL**.

If the Site URL is the bare apex, or the requested `redirectTo` is not
allow-listed, the link points at a host that may not resolve.

The app code now pins `redirectTo` to the canonical origin
(`NEXT_PUBLIC_SITE_URL`), not `window.location.origin` (see
`lib/site-url.ts` and `app/forgot-password/forgot-password-client.tsx`). That
removes the "whichever host the user was on" variable, but it only takes effect
once the two settings below are correct. Code alone cannot fix this.

## The fix (config, done once)

### 1. Supabase dashboard - Authentication -> URL Configuration

- **Site URL**: `https://www.newfeeschedule.com`
  (a host that resolves; never the bare apex).
- **Redirect URLs** allow-list, add:
  - `https://www.newfeeschedule.com/reset-password`
  - `https://www.newfeeschedule.com/**` (covers other flows)

  Keep these in sync with whatever `NEXT_PUBLIC_SITE_URL` is set to.

### 2. Vercel env

- `NEXT_PUBLIC_SITE_URL=https://www.newfeeschedule.com`
  Set for Production (and Preview if reset is tested there). Redeploy so the
  value is inlined into the client bundle.

### 3. DNS / domains (belt and suspenders)

- Point the apex `newfeeschedule.com` at Vercel and add a **301 redirect to
  `www`**, so old links and anyone typing the apex still land on a live host.
  This does not replace step 1; it stops the apex from being a dead end.

## How to verify

1. `NEXT_PUBLIC_SITE_URL` is set in Vercel Production and a fresh deploy has
   shipped.
2. Trigger a reset from `/forgot-password`.
3. In the email, the **Reset Password** link host is `www.newfeeschedule.com`
   and the path is `/reset-password` (or `/?code=...`, which the middleware
   forwards). It must load, not NXDOMAIN.
4. The `/reset-password` page reaches the "Choose a new password" form.

## Related code

- `lib/site-url.ts` - canonical origin helper used to build `redirectTo`.
- `app/forgot-password/forgot-password-client.tsx` - sends the recovery email.
- `app/reset-password/*` - consumes the recovery session, sets the new password.
- `middleware.ts` + `lib/auth/recovery-redirect.ts` - forward a root
  `/?code=...` hit to `/reset-password` (only fires if the host resolves).
