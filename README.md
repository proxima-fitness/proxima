# Proxima (monorepo)

Turborepo workspace for Proxima Fitness.

## Apps

| Path | What |
|------|------|
| `apps/landing` | Next.js app (marketing + logged-in product + Payload) |
| `apps/edge-functions` | Supabase Edge Functions (**Proxima MCP**, sync, etc.) — Deno |

Shared libraries live under `packages/` (ADR 0035).

## Deploy roots

| Surface | Root |
|---------|------|
| **Vercel** | `apps/landing` (Root Directory) |
| **Supabase Edge Functions** | `apps/edge-functions` (run `supabase functions` from this directory) |

## Common commands

```bash
npm install
npm run dev                 # landing Next dev server
npx turbo run build --filter=landing
npm run test:ci -w landing

cd apps/landing && ./start-local-supabase.sh
cd apps/edge-functions && npx supabase functions deploy mcp
```

## Domain docs

- Glossary: `CONTEXT.md`
- ADRs: `docs/adr/` (gitignored locally in some clones — check `.gitignore`)
