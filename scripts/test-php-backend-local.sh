#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4321}"
TMP_DIR="$(mktemp -d)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
TEST_FILE="$TMP_DIR/test-resume.pdf"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    fail "$label (expected status $expected, got $actual)"
  fi
  pass "$label"
}

extract_json_field() {
  local json="$1"
  local key="$2"
  php -r '$d=json_decode(stream_get_contents(STDIN), true); $k=$argv[1]; if (!is_array($d) || !array_key_exists($k,$d)) exit(1); $v=$d[$k]; if (is_scalar($v)) echo $v;' "$key" <<< "$json"
}

extract_nested_field() {
  local json="$1"
  local p1="$2"
  local p2="$3"
  php -r '$d=json_decode(stream_get_contents(STDIN), true); $a=$argv[1]; $b=$argv[2]; if (!is_array($d)||!isset($d[$a])||!is_array($d[$a])||!array_key_exists($b,$d[$a])) exit(1); $v=$d[$a][$b]; if (is_scalar($v)) echo $v;' "$p1" "$p2" <<< "$json"
}

echo "Running backend smoke tests against: $BASE_URL"

# 1) CSRF token
csrf_raw="$(curl -sS -c "$COOKIE_JAR" "$BASE_URL/api/csrf")"
csrf_token="$(extract_json_field "$csrf_raw" "token" || true)"
[[ -n "$csrf_token" ]] || fail "GET /api/csrf returns token"
pass "GET /api/csrf returns token"

# 2) Contact validation failure (missing fields)
contact_invalid_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/contact" -d '{}')"
contact_invalid_body="${contact_invalid_resp%$'\n'*}"
contact_invalid_status="${contact_invalid_resp##*$'\n'}"
assert_status "$contact_invalid_status" "400" "POST /api/leads/contact validation"
contact_ok_flag="$(extract_json_field "$contact_invalid_body" "ok" || true)"
[[ "$contact_ok_flag" == "" || "$contact_ok_flag" == "0" || "$contact_ok_flag" == "false" ]] || fail "contact validation response marks ok=false"
pass "contact validation response marks ok=false"

# 3) Contact success
contact_success_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/contact" -d '{"name":"Local Test","email":"local.test@example.com","company":"Techmigos","service":"web","budget":"10k-25k","message":"Need a project website build."}')"
contact_success_body="${contact_success_resp%$'\n'*}"
contact_success_status="${contact_success_resp##*$'\n'}"
assert_status "$contact_success_status" "200" "POST /api/leads/contact success"
contact_accepted="$(extract_nested_field "$contact_success_body" "data" "accepted" || true)"
[[ "$contact_accepted" == "1" || "$contact_accepted" == "true" ]] || fail "contact success response has accepted=true"
pass "contact success response has accepted=true"

# 4) Newsletter validation failure
newsletter_invalid_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/newsletter" -d '{"email":"invalid"}')"
newsletter_invalid_status="${newsletter_invalid_resp##*$'\n'}"
assert_status "$newsletter_invalid_status" "400" "POST /api/leads/newsletter validation"

# 5) Newsletter success
newsletter_success_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "Content-Type: application/json" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/newsletter" -d '{"email":"newsletter.test@example.com"}')"
newsletter_success_status="${newsletter_success_resp##*$'\n'}"
assert_status "$newsletter_success_status" "200" "POST /api/leads/newsletter success"

# 6) Careers validation failure
career_invalid_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/careers" -F "jobTitle=Backend Engineer" -F "name=Candidate" -F "email=candidate@example.com" -F "coverLetter=too short")"
career_invalid_status="${career_invalid_resp##*$'\n'}"
assert_status "$career_invalid_status" "400" "POST /api/leads/careers validation"

# 7) Careers success (minimal PDF payload)
printf '%s' '%PDF-1.4 local-test' > "$TEST_FILE"
cover_letter='I have over seven years of backend and cloud development experience.'
career_success_resp="$(curl -sS -w "\n%{http_code}" -b "$COOKIE_JAR" -H "x-csrf-token: $csrf_token" -X POST "$BASE_URL/api/leads/careers" -F "jobTitle=Backend Engineer" -F "name=Candidate Tester" -F "email=candidate.tester@example.com" -F "linkedin=https://linkedin.com/in/candidate" -F "portfolio=https://github.com/candidate" -F "coverLetter=$cover_letter" -F "cv=@$TEST_FILE;type=application/pdf")"
career_success_status="${career_success_resp##*$'\n'}"
assert_status "$career_success_status" "200" "POST /api/leads/careers success"

# 8) CSRF rejection check
csrf_reject_resp="$(curl -sS -w "\n%{http_code}" -H "Content-Type: application/json" -H "x-csrf-token: invalid" -X POST "$BASE_URL/api/leads/contact" -d '{"name":"x","email":"x@x.com","message":"x"}')"
csrf_reject_status="${csrf_reject_resp##*$'\n'}"
assert_status "$csrf_reject_status" "403" "CSRF rejection"

# 9) Admin me unauthorized
admin_me_resp="$(curl -sS -w "\n%{http_code}" "$BASE_URL/api/admin/auth/me")"
admin_me_status="${admin_me_resp##*$'\n'}"
assert_status "$admin_me_status" "401" "GET /api/admin/auth/me unauthorized"

# 10) Admin login invalid credentials
admin_login_invalid_resp="$(curl -sS -w "\n%{http_code}" -H "Content-Type: application/json" -X POST "$BASE_URL/api/admin/auth/login" -d '{"username":"invalid","password":"invalid"}')"
admin_login_invalid_status="${admin_login_invalid_resp##*$'\n'}"
assert_status "$admin_login_invalid_status" "401" "POST /api/admin/auth/login invalid credentials"

# 11) Admin login success (uses env or secure default fallback)
admin_username="${ADMIN_USERNAME:-admin}"
admin_password="${ADMIN_PASSWORD:-admin123}"
admin_login_success_resp="$(curl -sS -c "$COOKIE_JAR" -w "\n%{http_code}" -H "Content-Type: application/json" -X POST "$BASE_URL/api/admin/auth/login" -d "{\"username\":\"$admin_username\",\"password\":\"$admin_password\"}")"
admin_login_success_status="${admin_login_success_resp##*$'\n'}"
assert_status "$admin_login_success_status" "200" "POST /api/admin/auth/login success"

# 12) Admin me authorized
admin_me_auth_resp="$(curl -sS -b "$COOKIE_JAR" -w "\n%{http_code}" "$BASE_URL/api/admin/auth/me")"
admin_me_auth_status="${admin_me_auth_resp##*$'\n'}"
assert_status "$admin_me_auth_status" "200" "GET /api/admin/auth/me authorized"

# 13) Admin leads authorized
admin_leads_resp="$(curl -sS -b "$COOKIE_JAR" -w "\n%{http_code}" "$BASE_URL/api/admin/leads")"
admin_leads_status="${admin_leads_resp##*$'\n'}"
assert_status "$admin_leads_status" "200" "GET /api/admin/leads authorized"

echo "All smoke tests passed."
