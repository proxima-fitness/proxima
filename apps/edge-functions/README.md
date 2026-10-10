# Edge functions

Supabase Edge Functions for Proxima (**Proxima MCP**, Hevy sync, email, etc.). Deno runtime — not an npm workspace package.

## Layout

```text
apps/edge-functions/
  supabase/
    config.toml
    functions/          # deployable functions (mcp, hevy-program-sync, …)
  proxima-training-coach/     # Claude plugin “Proxima Training Coach” — see INSTALL.md
```

## Deploy root

Run Supabase CLI from this directory (`apps/edge-functions`). Example:

```bash
cd apps/edge-functions
npx supabase functions deploy mcp
```

Hosted project linking (`supabase link`) also uses this app as the working directory so `supabase/functions` resolves here.

## Source of truth

This tree is the monorepo source of truth for Edge Functions. The gitignored copy under `apps/landing/supabase/functions/` (if present) is a temporary local-serve leftover only.
