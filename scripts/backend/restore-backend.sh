#!/usr/bin/env bash
# Restores a TechMigos backend bundle into a different Supabase project.
#
# Run this from inside an extracted bundle directory:
#   cp .env.clone.example .env.clone   # then fill it in
#   ./scripts/restore-backend.sh
#
# Flags:
#   --env-file <file>     Env file with TARGET_* values (default .env.clone)
#   --skip-roles          Do not restore cluster roles
#   --skip-auth           Do not restore the auth schema dump
#   --skip-functions      Do not deploy edge functions
#   --skip-storage        Do not upload storage objects
#   --no-create-buckets   Fail instead of creating missing buckets
#   --skip-frontend       Do not print frontend repointing instructions
#   --yes                 Do not ask for confirmation

set -euo pipefail

BUNDLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BUNDLE_ROOT"

ENV_FILE=".env.clone"
SKIP_ROLES=0
SKIP_AUTH=0
SKIP_FUNCTIONS=0
SKIP_STORAGE=0
CREATE_BUCKETS="--create-buckets"
SKIP_FRONTEND=0
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --skip-roles) SKIP_ROLES=1; shift ;;
    --skip-auth) SKIP_AUTH=1; shift ;;
    --skip-functions) SKIP_FUNCTIONS=1; shift ;;
    --skip-storage) SKIP_STORAGE=1; shift ;;
    --no-create-buckets) CREATE_BUCKETS=""; shift ;;
    --skip-frontend) SKIP_FRONTEND=1; shift ;;
    --yes) ASSUME_YES=1; shift ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$1"; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.clone.example to $ENV_FILE and fill in the target project values." >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${TARGET_PROJECT_REF:?TARGET_PROJECT_REF is required}"
: "${TARGET_SUPABASE_URL:?TARGET_SUPABASE_URL is required}"

SUPABASE_CLI="${SUPABASE_CLI:-supabase}"
PSQL_IMAGE="${PSQL_IMAGE:-postgres:17}"
HAVE_PG_DUMP=0
[[ -s db/data.sql ]] && HAVE_PG_DUMP=1

echo "Bundle:  $BUNDLE_ROOT"
echo "Target:  $TARGET_PROJECT_REF ($TARGET_SUPABASE_URL)"
echo "Mode:    $([[ $HAVE_PG_DUMP -eq 1 ]] && echo 'pg_dump restore' || echo 'migrations + PostgREST data load')"

if [[ $ASSUME_YES -eq 0 ]]; then
  read -r -p "Continue? Existing rows in the target project may be overwritten. [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

run_psql() {
  # $1 = sql file path relative to bundle, remaining args = psql flags
  local file="$1"; shift
  docker run --rm -i --network=host -v "$BUNDLE_ROOT/db:/db:ro" "$PSQL_IMAGE" \
    psql --variable ON_ERROR_STOP=1 "$@" --file "/db/$file" --dbname "$TARGET_DB_URL"
}

step "Link the target project"
if [[ -n "${TARGET_DB_PASSWORD:-}" ]]; then
  "$SUPABASE_CLI" link --project-ref "$TARGET_PROJECT_REF" --password "$TARGET_DB_PASSWORD" --yes
else
  echo "TARGET_DB_PASSWORD is empty; skipping link. Commands below use explicit connection strings."
fi

step "Restore schema"
if [[ $HAVE_PG_DUMP -eq 1 ]]; then
  : "${TARGET_DB_URL:?TARGET_DB_URL is required for the pg_dump restore path}"
  if [[ $SKIP_ROLES -eq 0 && -s db/roles.sql ]]; then
    echo "-- restoring cluster roles (failures for managed roles are expected)"
    run_psql roles.sql --single-transaction || echo "role restore reported errors; continuing"
  fi
  run_psql schema.sql --single-transaction
  if [[ $SKIP_AUTH -eq 0 && -s db/auth.sql ]]; then
    echo "-- restoring auth schema (users, password hashes, identities)"
    run_psql auth.sql --single-transaction
  fi
  if [[ -s db/migration-history.sql ]]; then
    echo "-- restoring supabase_migrations history"
    run_psql migration-history.sql --single-transaction || echo "migration history restore reported errors; continuing"
  fi
  step "Restore data"
  run_psql data.sql --single-transaction --command 'SET session_replication_role = replica'
else
  : "${TARGET_DB_URL:?TARGET_DB_URL is required to apply migrations}"
  echo "-- applying local migrations (source of truth for schema, RLS and storage policies)"
  "$SUPABASE_CLI" db push --db-url "$TARGET_DB_URL" --include-all --yes
  if [[ $SKIP_AUTH -eq 0 && -s db/auth-users.json ]]; then
    step "Recreate Auth users"
    echo "-- passwords cannot be read from the API; each recreated account needs a password reset"
    node scripts/restore-auth-users.mjs --url "$TARGET_SUPABASE_URL" --service-key "${TARGET_SERVICE_ROLE_KEY:-}"
  fi
  step "Load table data through PostgREST"
  node scripts/rest-load.mjs --url "$TARGET_SUPABASE_URL" --service-key "${TARGET_SERVICE_ROLE_KEY:-}" --data db/rest-data
fi

if [[ $SKIP_STORAGE -eq 0 && -d storage && -s storage/storage-manifest.json ]]; then
  step "Restore storage objects"
  node scripts/export-storage.mjs --mode restore \
    --url "$TARGET_SUPABASE_URL" \
    --service-key "${TARGET_SERVICE_ROLE_KEY:-}" \
    --in storage $CREATE_BUCKETS
fi

if [[ $SKIP_FUNCTIONS -eq 0 ]]; then
  step "Deploy edge functions"
  for dir in supabase/functions/*/; do
    name="$(basename "$dir")"
    echo "-- deploying $name"
    "$SUPABASE_CLI" functions deploy "$name" --project-ref "$TARGET_PROJECT_REF" --use-api
  done
fi

step "Verification"
node scripts/verify-backend.mjs --url "$TARGET_SUPABASE_URL" \
  --service-key "${TARGET_SERVICE_ROLE_KEY:-}" \
  --report-only || echo "verification reported differences (see verify-report.json)"

if [[ $SKIP_FRONTEND -eq 0 ]]; then
  step "Repoint the frontend"
  cat <<EOF
The frontend hardcodes the old project in vercel.json, src/layouts/BaseLayout.astro,
.env.example, env.example.json, .env.local and the identity helper scripts. From your
repository checkout run:

  node scripts/backend/update-frontend-ref.mjs \\
    --url $TARGET_SUPABASE_URL \\
    --publishable-key <new publishable key> \\
    --ref $TARGET_PROJECT_REF \\
    --old-ref <previous project ref>

Then in the target project:
  - Auth > URL configuration: set Site URL and add /change-password, /reset-password redirects
  - Edge Functions > Secrets: set SITE_URL and ALLOWED_ORIGINS (see meta/secrets.json for the names)
  - Vercel: update PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY for the deployment
EOF
fi

echo
echo "Restore finished. Review MANIFEST.json and verify-report.json before cutting over."
