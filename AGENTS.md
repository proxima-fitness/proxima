# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Proxima Fitness is a Next.js 16 (App Router) monolithic web app — an AI-powered workout program builder with Payload CMS, Supabase backend, and Hevy app integration. See `package.json` for all scripts.

### Services

| Service | How to run | Notes |
|---|---|---|
| Next.js dev server | `npm run dev` | Runs on port 3000. Includes both the main app routes `(app)` and Payload CMS admin `(payload)`. |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Required for Payload CMS. Must be running before `npm run dev`. Database: `payload`, user: `postgres`, password: `postgres`. |

### Environment variables
The app loads `.env.local` in dev mode (see `next.config.mjs`). Key required vars:
- `DATABASE_URI` — PostgreSQL connection string for Payload CMS
- `PAYLOAD_SECRET` — Payload CMS secret (any string >= 32 chars)
- `NEXT_PUBLIC_REACT_APP_SUPABASE_URL` / `NEXT_PUBLIC_REACT_APP_SUPABASE_KEY` — Supabase credentials (placeholder values allow dev server to start but Supabase-dependent features won't work)
- `NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY` — Cloudflare Turnstile key (use test key `1x00000000000000000000AA` for dev)

### Non-obvious caveats
- **PostgreSQL must be started manually** before `npm run dev` since it's not auto-started on boot in this environment. Run `sudo pg_ctlcluster 16 main start`.
- **Pre-commit hook** (`.husky/pre-commit`) runs `npx lint-staged` AND `npm run build`, so commits will fail if there are lint errors or build failures.
- **Lint has pre-existing errors**: `npm run lint` exits with code 1 due to 7 pre-existing errors (mainly React hooks rules in `use-supabase-upload.ts`). This is expected.
- **Programs page** shows "An error occurred fetching programs" without real Supabase credentials — this is expected with placeholder env vars.
- **AVIF image warnings** during dev are expected — Turbopack doesn't support AVIF optimization.
- Tests use **vitest** with no config file (uses defaults). Run with `npm test` or `npx vitest run`.
