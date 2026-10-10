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

## Rotate leaked Supabase `service_role` JWT

A production `service_role` JWT for project ref `oivloxjpauqrggayaovk` was
committed in `apps/landing/supabase/migrations/00000000000000_baseline.sql`
(trigger `resend-general-add-contact`). The working tree uses
`Bearer <SUPABASE_SERVICE_ROLE_KEY>`; **git history still has the real key**
(commit `31c2f9f2`). Rotation invalidates the leak; history rewrite is
optional after that.

1. In the [Supabase dashboard](https://supabase.com/dashboard) → project
   `oivloxjpauqrggayaovk` → **Project Settings → API**, rotate / regenerate
   the `service_role` key.
2. Confirm old JWTs fail (any call with the previous Bearer token should
   401).
3. Update the live database trigger Authorization header to the **new**
   key (SQL Editor or equivalent) — do **not** commit the new JWT:

   ```sql
   -- Example shape only; paste the new key locally, never into git.
   CREATE OR REPLACE TRIGGER "resend-general-add-contact"
   AFTER INSERT ON "public"."users"
   FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"(
     'https://oivloxjpauqrggayaovk.supabase.co/functions/v1/resend-add-contact',
     'POST',
     '{"Content-type":"application/json","Authorization":"Bearer <NEW_SERVICE_ROLE_KEY>"}',
     '{}',
     '5000'
   );
   ```
4. Smoke-test: insert/sign up a user (or otherwise fire the trigger) and
   confirm `resend-add-contact` still runs.
5. Optional: rewrite git history to purge the old JWT, or accept that
   rotation alone is enough.
6. Keep future webhook secrets out of migrations (see
   [CONTRIBUTING.md](CONTRIBUTING.md) Secrets).
