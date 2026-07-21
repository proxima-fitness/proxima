# Proxima Landing

## Local Supabase

Requires Docker Desktop, Node, and a shell that can run bash (Git Bash / WSL on Windows).

```bash
# Start local Supabase, run migrations, seed Hevy exercises + warmup templates, create test user, regen types
# Points .env.local (or .env) at http://127.0.0.1:54321
./start-local-supabase.sh

# App (uses NEXT_PUBLIC_REACT_APP_SUPABASE_* from .env.local)
npm run dev

# Stop all local Supabase containers
npx supabase stop

# Status / local URLs + keys
npx supabase status
```

Revert `.env.local` to prod: remove the `LOCAL SUPABASE` block at the bottom, uncomment lines prefixed with `# PROD #`.

### Test login

After `./start-local-supabase.sh`:

- Email: `test@localhost.dev`
- Password: `Password123!`
