## Agent skills

### Issue tracker

Issues live in Linear (Proxima Fitness team, Proxima Landing Page project). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles mapped to Linear labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` (active + `complete/` for shipped). See `docs/agents/domain.md`.

### Strategy docs

Product and investor positioning: `docs/strategy/coaching-vs-programming-positioning.md`.

### Database (Supabase)

In `public` schema migrations, foreign keys to a user must reference **`public.users (id)`**, not `auth.users`. See `.cursor/rules/supabase-migrations.mdc` and existing FKs in `supabase/migrations/00000000000000_baseline.sql`.
