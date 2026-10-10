# Open-source cleanup

Manual follow-ups after AGPL / CLA packaging. Cross off when done.

## CLA Assistant (required before merging outside PRs)

[CLA.md](CLA.md) and [CONTRIBUTING.md](CONTRIBUTING.md) are in the repo.
Wire up the bot:

1. Open [https://cla-assistant.io/](https://cla-assistant.io/) and sign in with GitHub.
2. **Configure CLA** → select `proxima-fitness/proxima`.
3. CLA document URL:
   `https://github.com/proxima-fitness/proxima/blob/main/CLA.md`
4. Approve the Gist + webhook installation when prompted.
5. Open a throwaway PR (or use an existing outside PR) and confirm the CLA check appears.

Until this is done, do not merge third-party pull requests.

## Migrate off legacy JWT API keys (then disable them)

Supabase has two key systems. Creating `sb_publishable_…` / `sb_secret_…` does
**not** revoke legacy `anon` / `service_role` JWTs (`eyJ…`). Both work until you
**Disable legacy API keys** on the Legacy tab.

| Dashboard tab | Format | Maps to Postgres role |
|---------------|--------|------------------------|
| Publishable and secret | `sb_publishable_…` / `sb_secret_…` | `anon` (+ Auth → `authenticated`) / `service_role` |
| Legacy anon, service_role | JWT `eyJ…` | same roles |

Docs: [API keys](https://supabase.com/docs/guides/api/api-keys).

**Do not change** SQL `GRANT … TO service_role` or RLS `TO service_role` — those
are Postgres role names, not API keys.

### Target env values

| Variable | Put this value | Where |
|----------|----------------|--------|
| `NEXT_PUBLIC_REACT_APP_SUPABASE_KEY` | publishable `sb_publishable_…` (main project) | Vercel, `.env.local` |
| `NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY` | publishable for the **blog** Supabase project | Vercel, `.env.local` |
| `SUPABASE_SECRET_KEY` | secret `sb_secret_…` (main project) | Vercel / server only — never `NEXT_PUBLIC_` |

Landing code already reads these names (`createClient` / `getServiceRoleClient`).
Swap the **values** from `eyJ…` to `sb_…`. No rename required for the Next app.

Confirm values: publishable starts with `sb_publishable_`; secret with `sb_secret_`.
If either still starts with `eyJ`, you are still on legacy.

### Inventory — what still depends on API keys

#### A. Next.js (landing) — env value swap only

These pass `NEXT_PUBLIC_REACT_APP_SUPABASE_KEY` into Supabase clients / fetches.
They keep working once that env holds a publishable key.

| Location | Role |
|----------|------|
| `apps/landing/src/utils/supabase/client.ts` | Browser client (publishable) |
| `apps/landing/src/utils/supabase/server.ts` | Cookie server client (publishable) |
| `apps/landing/src/utils/supabase/middleware.ts` | Middleware client (publishable) |
| `apps/landing/src/api/index.ts` | Exports `supabaseKey` / blog client |
| `apps/landing/src/api/edge-functions.ts` | Calls edge functions with `Authorization: Bearer ${supabaseKey}` |
| `apps/landing/next.config.mjs` | Exposes the public key to the bundle |
| `apps/landing/.env.template` | Documents the vars |

Secret (`SUPABASE_SECRET_KEY`) — already the new env **name**; ensure value is `sb_secret_…`:

| Location | Role |
|----------|------|
| `apps/landing/src/api/supabase-admin.ts` | RLS-bypass client |
| `apps/landing/src/app/api/auth/delete-account/route.ts` | Auth Admin `deleteUser` |
| `apps/landing/src/app/api/hevy-program-sync/route.ts` | Invokes edge fn with `Authorization: Bearer ${SUPABASE_SECRET_KEY}` |
| Callers of `getServiceRoleClient()` | `workout-history` mirror, `/api/v1/exercises`, `/api/v1/workouts` |

**Action:** In Vercel (Production + Preview) and local `.env.local`, set the three
vars above to `sb_…` keys. Redeploy. Smoke-test login, program load, delete-account,
Hevy sync, public API.

**Edge invoke note:** New keys prefer the `apikey` header; Bearer still works for
platform `verify_jwt` compatibility. If an edge call 401s after the swap, send both:

```http
apikey: sb_secret_…
Authorization: Bearer sb_secret_…
```

(same for publishable when the browser/client calls a function).

#### B. Edge Functions — new key injects only

| File | Reads |
|------|-------|
| `apps/edge-functions/supabase/functions/hevy-program-sync/supabase.ts` | `SUPABASE_SECRET_KEYS["default"]` |
| `apps/edge-functions/supabase/functions/upstash-redis-ratelimit/index.ts` | `SUPABASE_PUBLISHABLE_KEYS["default"]` |

No legacy `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` fallbacks.
`mcp` does not read these. Other functions do not build a Supabase client from API keys.

**Action:** Redeploy edge functions after Vercel/env uses `sb_…` keys.

#### C. Live database trigger (not fixed by Vercel env alone)

| What | Detail |
|------|--------|
| Trigger | `resend-general-add-contact` on `public.users` |
| Calls | `…/functions/v1/resend-add-contact` with `Authorization: Bearer <key>` |
| In git | Placeholder `Bearer <SUPABASE_SERVICE_ROLE_KEY>` in `apps/landing/supabase/migrations/00000000000000_baseline.sql` |
| In prod | Still had a real legacy JWT in history (commit `31c2f9f2`); live header may still be that JWT |

**Action:** In SQL Editor, recreate the trigger with a **secret** key (`sb_secret_…`).
Do not commit the real key. Smoke-test signup → Resend contact.

#### D. Local dev script

| File | Issue |
|------|-------|
| `apps/landing/start-local-supabase.sh` | Reads `ANON_KEY` from `supabase status`; comments out prod lines matching `KEY=eyJ` only |

**Action:** After local CLI exposes publishable keys, prefer that field (and
`SUPABASE_SECRET_KEY` from status) when writing `.env.local`. Until then, local
JWT keys are fine — they are not the production leak. When commenting prod keys,
also match `sb_publishable_` / `sb_secret_` prefixes.

#### E. Manual / test-only

| File | Note |
|------|------|
| `apps/landing/src/api/__tests__/manual/import-hevy-workout-page.ts` | Uses `SUPABASE_SECRET_KEY` |
| `apps/landing/vitest.setup.ts` | Dummy strings; no prod impact |

#### F. Blog project

`NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_*` is a **separate** Supabase project. Migrate
and/or disable legacy keys there independently if that project also has JWT keys.

### Ordered checklist

Code in this repo reads `SUPABASE_SECRET_KEYS` / `SUPABASE_PUBLISHABLE_KEYS`,
sends `apikey` for `sb_*` keys, and sets `verify_jwt = false` on API-key-invoked
edge functions.

- [x] **Disable legacy API keys** (Dashboard → Legacy) — done; leaked JWT is inert.
- [ ] **Vercel env** = `sb_publishable_…` / `sb_secret_…` (not `eyJ…`); redeploy landing.
- [ ] **Local `.env.local`** — same when pointing at prod.
- [ ] **Redeploy edge functions** (so `verify_jwt = false` + new key reads ship):

  ```bash
  cd apps/edge-functions
  npx supabase functions deploy hevy-program-sync
  npx supabase functions deploy upstash-redis-ratelimit
  npx supabase functions deploy chat
  npx supabase functions deploy text-to-json
  npx supabase functions deploy image-to-text
  npx supabase functions deploy speech-to-text
  npx supabase functions deploy nsfw-image-detection
  npx supabase functions deploy resend-add-contact
  ```

- [ ] **SQL — Resend trigger** uses `apikey` + `sb_secret_…` (not Bearer JWT):

  ```sql
  CREATE OR REPLACE TRIGGER "resend-general-add-contact"
  AFTER INSERT ON "public"."users"
  FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"(
    'https://oivloxjpauqrggayaovk.supabase.co/functions/v1/resend-add-contact',
    'POST',
    '{"Content-type":"application/json","apikey":"<NEW_SECRET_KEY>"}',
    '{}',
    '5000'
  );
  ```

- [ ] **Smoke-test** — login, programs, delete-account, Hevy sync, AI edges, signup → Resend.
- [ ] Optional: blog project legacy keys; git history rewrite.
