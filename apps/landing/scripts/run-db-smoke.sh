#!/usr/bin/env bash
# Run all local Postgres smoke scripts under supabase/snippets/verify_*.sql.
# Requires local Supabase DB (./start-local-supabase.sh). Not for CI/pre-commit.
#
#   npm run test:db-smoke
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_proxima_landing}"
SNIPPET_DIR="supabase/snippets"

run_sql_file() {
    local file="$1"
    if command -v psql >/dev/null 2>&1; then
        psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
    else
        docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - <"$file"
    fi
}

db_reachable() {
    if command -v psql >/dev/null 2>&1; then
        psql "$DB_URL" -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null 2>&1
    else
        docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null 2>&1
    fi
}

if ! db_reachable; then
    echo "ERROR: local Supabase DB not reachable."
    echo "  Start with: ./start-local-supabase.sh"
    echo "  Expected:   $DB_URL  (container: $DB_CONTAINER)"
    exit 1
fi

shopt -s nullglob
files=("$SNIPPET_DIR"/verify_*.sql)
if [ ${#files[@]} -eq 0 ]; then
    echo "ERROR: no $SNIPPET_DIR/verify_*.sql files found."
    exit 1
fi

# Stable order
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

pass=0
fail=0
failed_names=()

echo "==> DB smoke: ${#files[@]} script(s)"
echo

for file in "${files[@]}"; do
    name="$(basename "$file")"
    echo "── $name"
    if run_sql_file "$file"; then
        echo "OK  $name"
        pass=$((pass + 1))
    else
        echo "FAIL $name"
        fail=$((fail + 1))
        failed_names+=("$name")
    fi
    echo
done

echo "==> DB smoke summary: $pass passed, $fail failed"
if [ "$fail" -ne 0 ]; then
    for name in "${failed_names[@]}"; do
        echo "  - $name"
    done
    exit 1
fi
