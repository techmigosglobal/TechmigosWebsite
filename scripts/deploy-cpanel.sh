#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/scripts/deploy-cpanel.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

REMOTE_ALIAS="${REMOTE_ALIAS:-techmigos-prod}"
REMOTE_WEBROOT="${REMOTE_WEBROOT:-/home/techmigo/public_html}"
DOMAIN="${DOMAIN:-techmigos.com}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-techmigo_cmpny}"
DB_USER="${DB_USER:-techmigo_vinay}"
RUN_BUILD=1
IMPORT_SCHEMA=1
RUN_SMOKE=1
DRY_RUN=0
CHECK_REMOTE_ENV=1

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-cpanel.sh [options]

Options:
  --remote <alias>        SSH config alias (default: techmigos-prod)
  --webroot <path>        Remote web root (default: /home/techmigo/public_html)
  --domain <host>         Public domain for smoke checks (default: techmigos.com)
  --db-host <host>        Database host (default: localhost)
  --db-port <port>        Database port (default: 3306)
  --db-name <name>        Database name (default: techmigo_cmpny)
  --db-user <user>        Database user (default: techmigo_vinay)
  --no-build              Skip npm build
  --no-schema             Skip schema import
  --no-smoke              Skip curl smoke checks
  --skip-env-check        Skip remote runtime env readiness check
  --dry-run               Show actions without changing remote
  -h, --help              Show this help

Environment file (optional):
  scripts/deploy-cpanel.env
EOF
}

log() {
  printf '\n[deploy] %s\n' "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)
      REMOTE_ALIAS="$2"
      shift 2
      ;;
    --webroot)
      REMOTE_WEBROOT="$2"
      shift 2
      ;;
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    --db-host)
      DB_HOST="$2"
      shift 2
      ;;
    --db-port)
      DB_PORT="$2"
      shift 2
      ;;
    --db-name)
      DB_NAME="$2"
      shift 2
      ;;
    --db-user)
      DB_USER="$2"
      shift 2
      ;;
    --no-build)
      RUN_BUILD=0
      shift
      ;;
    --no-schema)
      IMPORT_SCHEMA=0
      shift
      ;;
    --no-smoke)
      RUN_SMOKE=0
      shift
      ;;
    --skip-env-check)
      CHECK_REMOTE_ENV=0
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd ssh
require_cmd rsync
require_cmd scp
require_cmd npm
require_cmd curl
require_cmd tar

if [[ "$RUN_BUILD" -eq 1 ]]; then
  log "Building Astro frontend"
  npm run build
fi

if [[ ! -d "$ROOT_DIR/dist" ]]; then
  echo "dist directory not found. Run build first." >&2
  exit 1
fi

STATIC_DIR="$ROOT_DIR/dist/client"
if [[ ! -d "$STATIC_DIR" ]]; then
  echo "dist/client directory not found. Build output is not ready for static deployment." >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/php-backend/api" ]]; then
  echo "php-backend/api not found." >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_FLAGS="-azvn --delete"
else
  RSYNC_FLAGS="-az --delete"
fi

log "Testing SSH connectivity to $REMOTE_ALIAS"
ssh "$REMOTE_ALIAS" "whoami >/dev/null && pwd >/dev/null"

if [[ "$CHECK_REMOTE_ENV" -eq 1 ]]; then
  log "Checking remote API environment file"
  if ssh "$REMOTE_ALIAS" "test -f '$REMOTE_WEBROOT/api/.env.php'"; then
    log "Found remote env file at $REMOTE_WEBROOT/api/.env.php"
  else
    echo "No remote $REMOTE_WEBROOT/api/.env.php file detected." >&2
    echo "If you provide runtime env vars through cPanel/Apache SetEnv, rerun with --skip-env-check." >&2
    echo "Otherwise create api/.env.php from php-backend/api/.env.php.example before deploying." >&2
    exit 1
  fi
fi

REMOTE_HAS_RSYNC=0
if ssh "$REMOTE_ALIAS" "command -v rsync >/dev/null 2>&1"; then
  REMOTE_HAS_RSYNC=1
fi

if [[ "$REMOTE_HAS_RSYNC" -eq 1 ]]; then
  log "Remote rsync detected: using rsync sync mode"

  log "Syncing static frontend to $REMOTE_ALIAS:$REMOTE_WEBROOT"
  # Keep backend/runtime directories safe during static sync.
  rsync $RSYNC_FLAGS \
    --exclude "api/" \
    --exclude "storage/" \
    "$STATIC_DIR/" "$REMOTE_ALIAS:$REMOTE_WEBROOT/"

  log "Syncing PHP API backend"
  rsync $RSYNC_FLAGS \
    php-backend/api/ "$REMOTE_ALIAS:$REMOTE_WEBROOT/api/"
else
  log "Remote rsync not available: using tar-over-SSH fallback mode"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "ssh $REMOTE_ALIAS \"mkdir -p '$REMOTE_WEBROOT' && find '$REMOTE_WEBROOT' -mindepth 1 -maxdepth 1 ! -name api ! -name storage -exec rm -rf {} +\""
    echo "tar -C $STATIC_DIR -cf - . | ssh $REMOTE_ALIAS \"tar -C '$REMOTE_WEBROOT' -xf -\""
    echo "ssh $REMOTE_ALIAS \"rm -rf '$REMOTE_WEBROOT/api' && mkdir -p '$REMOTE_WEBROOT/api'\""
    echo "tar -C php-backend/api -cf - . | ssh $REMOTE_ALIAS \"tar -C '$REMOTE_WEBROOT/api' -xf -\""
  else
    ssh "$REMOTE_ALIAS" "mkdir -p '$REMOTE_WEBROOT' && find '$REMOTE_WEBROOT' -mindepth 1 -maxdepth 1 ! -name api ! -name storage -exec rm -rf {} +"
    tar -C "$STATIC_DIR" -cf - . | ssh "$REMOTE_ALIAS" "tar -C '$REMOTE_WEBROOT' -xf -"

    ssh "$REMOTE_ALIAS" "rm -rf '$REMOTE_WEBROOT/api' && mkdir -p '$REMOTE_WEBROOT/api'"
    tar -C php-backend/api -cf - . | ssh "$REMOTE_ALIAS" "tar -C '$REMOTE_WEBROOT/api' -xf -"
  fi
fi

log "Ensuring upload directory exists"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "ssh $REMOTE_ALIAS mkdir -p $REMOTE_WEBROOT/storage/uploads/careers"
else
  ssh "$REMOTE_ALIAS" "mkdir -p '$REMOTE_WEBROOT/storage/uploads/careers'"
fi

if [[ "$IMPORT_SCHEMA" -eq 1 ]]; then
  SCHEMA_LOCAL="$ROOT_DIR/php-backend/database/schema.sql"
  SCHEMA_REMOTE="/home/techmigo/schema.sql"

  if [[ ! -f "$SCHEMA_LOCAL" ]]; then
    echo "Schema file not found: $SCHEMA_LOCAL" >&2
    exit 1
  fi

  log "Uploading schema SQL"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "scp $SCHEMA_LOCAL $REMOTE_ALIAS:$SCHEMA_REMOTE"
  else
    scp "$SCHEMA_LOCAL" "$REMOTE_ALIAS:$SCHEMA_REMOTE"
  fi

  log "Importing MySQL schema (you will be prompted for DB password on remote)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "ssh -t $REMOTE_ALIAS mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < $SCHEMA_REMOTE"
  else
    ssh -t "$REMOTE_ALIAS" "mysql -h '$DB_HOST' -P '$DB_PORT' -u '$DB_USER' -p '$DB_NAME' < '$SCHEMA_REMOTE'"
    ssh "$REMOTE_ALIAS" "rm -f '$SCHEMA_REMOTE'"
  fi
fi

if [[ "$RUN_SMOKE" -eq 1 ]]; then
  log "Running smoke checks against https://$DOMAIN"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "curl -i https://$DOMAIN/api/csrf"
    echo "curl -i https://$DOMAIN/support/"
    echo "curl -i -c <cookie-file> https://$DOMAIN/api/csrf"
    echo "curl -i -b <cookie-file> -X POST https://$DOMAIN/api/leads/contact -H 'Content-Type: application/json' -H 'x-csrf-token: <token-from-csrf>' -d '{}'"
    echo "curl -i -b <cookie-file> -X POST https://$DOMAIN/api/leads/newsletter -H 'Content-Type: application/json' -H 'x-csrf-token: <token-from-csrf>' -d '{}'"
    echo "curl -i -b <cookie-file> -X POST https://$DOMAIN/api/leads/careers -H 'x-csrf-token: <token-from-csrf>' -F 'jobTitle=x' -F 'name=x' -F 'email=x@x.com' -F 'coverLetter=short'"
    echo "curl -i https://$DOMAIN/api/admin/auth/me"
    echo "curl -i https://$DOMAIN/api/admin/leads"
    echo "curl -i -X POST https://$DOMAIN/api/admin/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"invalid\",\"password\":\"invalid\"}'"
  else
    cookie_file="$(mktemp)"
    csrf_response_file="$(mktemp)"
    contact_response_file="$(mktemp)"
    newsletter_response_file="$(mktemp)"
    careers_response_file="$(mktemp)"
    admin_me_response_file="$(mktemp)"
    admin_leads_response_file="$(mktemp)"
    admin_login_response_file="$(mktemp)"

    cleanup_smoke() {
      rm -f "$cookie_file" "$csrf_response_file" "$contact_response_file" "$newsletter_response_file" "$careers_response_file" "$admin_me_response_file" "$admin_leads_response_file" "$admin_login_response_file"
    }
    trap cleanup_smoke EXIT

    csrf_status="$(curl -sS -c "$cookie_file" -o "$csrf_response_file" -w '%{http_code}' "https://$DOMAIN/api/csrf")"
    if [[ "$csrf_status" != "200" ]]; then
      echo "CSRF smoke check failed with status $csrf_status" >&2
      cat "$csrf_response_file" >&2 || true
      exit 1
    fi

    support_status="$(curl -sS -o /dev/null -w '%{http_code}' "https://$DOMAIN/support/")"
    if [[ "$support_status" != "200" ]]; then
      echo "Support page smoke check failed with status $support_status" >&2
      exit 1
    fi

    csrf_token="$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$csrf_response_file" | head -n1)"
    if [[ -z "$csrf_token" ]]; then
      echo "CSRF smoke check failed: token missing in response" >&2
      cat "$csrf_response_file" >&2 || true
      exit 1
    fi

    contact_status="$(curl -sS -b "$cookie_file" -o "$contact_response_file" -w '%{http_code}' -X POST "https://$DOMAIN/api/leads/contact" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -d '{}')"
    if [[ "$contact_status" != "400" ]]; then
      echo "Contact validation smoke check failed with status $contact_status" >&2
      cat "$contact_response_file" >&2 || true
      if grep -q "Database is not configured" "$contact_response_file"; then
        echo "Hint: Configure DB env vars in cPanel or create $REMOTE_WEBROOT/api/.env.php from php-backend/api/.env.php.example" >&2
      fi
      exit 1
    fi

    newsletter_status="$(curl -sS -b "$cookie_file" -o "$newsletter_response_file" -w '%{http_code}' -X POST "https://$DOMAIN/api/leads/newsletter" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -d '{}')"
    if [[ "$newsletter_status" != "400" ]]; then
      echo "Newsletter validation smoke check failed with status $newsletter_status" >&2
      cat "$newsletter_response_file" >&2 || true
      exit 1
    fi

    careers_status="$(curl -sS -b "$cookie_file" -o "$careers_response_file" -w '%{http_code}' -X POST "https://$DOMAIN/api/leads/careers" -H "x-csrf-token: $csrf_token" -F "jobTitle=Backend Engineer" -F "name=Smoke Test" -F "email=smoke.test@example.com" -F "coverLetter=short")"
    if [[ "$careers_status" != "400" ]]; then
      echo "Careers validation smoke check failed with status $careers_status" >&2
      cat "$careers_response_file" >&2 || true
      exit 1
    fi

    admin_me_status="$(curl -sS -o "$admin_me_response_file" -w '%{http_code}' "https://$DOMAIN/api/admin/auth/me")"
    if [[ "$admin_me_status" != "401" ]]; then
      echo "Admin auth/me smoke check failed with status $admin_me_status (expected 401)" >&2
      cat "$admin_me_response_file" >&2 || true
      exit 1
    fi

    admin_leads_status="$(curl -sS -o "$admin_leads_response_file" -w '%{http_code}' "https://$DOMAIN/api/admin/leads")"
    if [[ "$admin_leads_status" != "401" ]]; then
      echo "Admin leads auth smoke check failed with status $admin_leads_status (expected 401)" >&2
      cat "$admin_leads_response_file" >&2 || true
      exit 1
    fi

    admin_login_status="$(curl -sS -o "$admin_login_response_file" -w '%{http_code}' -X POST "https://$DOMAIN/api/admin/auth/login" -H "Content-Type: application/json" -d '{"username":"invalid","password":"invalid"}')"
    if [[ "$admin_login_status" != "401" ]]; then
      echo "Admin login contract smoke check failed with status $admin_login_status (expected 401 for invalid credentials)" >&2
      cat "$admin_login_response_file" >&2 || true
      exit 1
    fi

    cleanup_smoke
    trap - EXIT
  fi
fi

log "Deployment completed successfully"
