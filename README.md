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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Outside pull requests require a
signed [Contributor License Agreement](CLA.md) (CLA Assistant).

## License

Proxima is licensed under the [GNU AGPL v3.0](LICENSE). If you run a
modified version as a network service, you must publish your source
code under the same license.

Want to use Proxima without AGPL obligations? Contact us about a
commercial license: jack@proximafitness.com.

"Proxima Fitness" and the Proxima logo are not covered by this license.
Forks must use a different name and branding.
