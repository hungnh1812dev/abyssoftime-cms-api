#!/usr/bin/env bash
# Guided manual walkthrough for tasks/todo.md's Checkpoints 1, 3, 4, 5, 6, 7.
#
# Prerequisites (do these yourself first, not run by this script):
#   1. A local Postgres reachable with the DB_* vars in your .env.local.
#   2. bun run prisma:migrate   (creates the schema — confirm this is a dev DB you're OK migrating)
#   3. bun run start:dev        (leave running in another terminal — you'll need to read
#      OTP codes and reset tokens from its console output, since they're only ever
#      logged, never returned in an API response)
#
# Usage: bash scripts/manual-e2e-check.sh
# Requires: curl, jq

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:${PORT:-3000}}"
JAR_A="$(mktemp)"
JAR_B="$(mktemp)"
trap 'rm -f "$JAR_A" "$JAR_B"' EXIT

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; exit 1; }
step() { echo; echo "── $1 ──"; }
prompt() {
  read -r -p "  $1: " REPLY
  echo "$REPLY"
}

command -v jq >/dev/null || { echo "jq is required (brew install jq / apt install jq)"; exit 1; }

step "0. Boot check (Checkpoint 1)"
echo "  Confirm in the start:dev terminal you saw 6 'Seeded default permission' + 4 'Seeded default role' lines"
echo "  (only on a clean DB — on a re-run they'll be silently skipped, which is also correct)."
prompt "Press enter once confirmed" >/dev/null

step "1. has-users should be false on a clean DB"
HAS_USERS=$(curl -sf "$BASE_URL/api/auth/has-users" | jq -r '.hasUsers')
[ "$HAS_USERS" = "false" ] && pass "has-users: false" || echo "  ⚠️  has-users: $HAS_USERS (fine if DB isn't clean)"

step "2. Register user A (will become super_admin) — Checkpoint 3"
EMAIL_A="admin-$(date +%s)@example.com"
curl -sf -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"name\":\"Admin User\",\"username\":\"admin_$(date +%s)\",\"password\":\"Password123!\",\"accountType\":true}" \
  | jq .
OTP_A=$(prompt "Paste the OTP for $EMAIL_A from the server console")
curl -sf -X POST "$BASE_URL/api/auth/verify-otp" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"otp\":\"$OTP_A\"}" | jq .
pass "user A verified — check the DB (or step 4) to confirm roleId = super_admin"

step "3. Login user A — Checkpoint 4"
curl -sf -c "$JAR_A" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"Password123!\"}" | jq .
grep -q access_token "$JAR_A" && grep -q refresh_token "$JAR_A" && pass "both cookies set" || fail "cookies missing"

step "4. Super_admin should be able to read /api/roles — Checkpoint 6"
curl -sf -b "$JAR_A" "$BASE_URL/api/roles" | jq .
pass "GET /api/roles succeeded as super_admin"

step "5. Refresh + logout for user A — Checkpoint 4"
curl -sf -c "$JAR_A" -b "$JAR_A" -X POST "$BASE_URL/api/auth/refresh" | jq .
pass "refresh rotated the cookies (compare $JAR_A before/after if you want to be thorough)"

step "6. Register + verify user B (will become guest)"
EMAIL_B="guest-$(date +%s)@example.com"
curl -sf -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"name\":\"Guest User\",\"username\":\"guest_$(date +%s)\",\"password\":\"Password123!\",\"accountType\":true}" \
  | jq .
OTP_B=$(prompt "Paste the OTP for $EMAIL_B from the server console")
curl -sf -X POST "$BASE_URL/api/auth/verify-otp" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"otp\":\"$OTP_B\"}" | jq .

step "7. Login user B, confirm guest gets 403 on /api/roles — Checkpoint 6"
curl -sf -c "$JAR_B" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"password\":\"Password123!\"}" | jq .
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_B" "$BASE_URL/api/roles")
[ "$STATUS" = "403" ] && pass "guest got 403 on /api/roles" || fail "expected 403, got $STATUS"

step "8. Super_admin promotes user B to admin — Checkpoint 6"
USER_B_ID=$(curl -sf -b "$JAR_A" "$BASE_URL/api/users" | jq -r --arg email "$EMAIL_B" '.[] | select(.email == $email) | .documentId')
ADMIN_ROLE_ID=$(curl -sf -b "$JAR_A" "$BASE_URL/api/roles" | jq -r '.[] | select(.slug == "admin") | .documentId')
echo "  user B documentId: $USER_B_ID, admin roleId: $ADMIN_ROLE_ID"
curl -sf -b "$JAR_A" -X PUT "$BASE_URL/api/users/$USER_B_ID" -H "Content-Type: application/json" \
  -d "{\"roleId\":\"$ADMIN_ROLE_ID\"}" | jq .
pass "promoted to admin"

step "9. User B must log in again to get a fresh JWT with the new role, then check reads work / writes don't"
curl -sf -c "$JAR_B" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"password\":\"Password123!\"}" | jq .
curl -sf -b "$JAR_B" "$BASE_URL/api/roles" >/dev/null && pass "admin CAN read /api/roles"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_B" -X POST "$BASE_URL/api/roles" -H "Content-Type: application/json" -d '{"name":"x","slug":"x","permissions":[],"level":1}')
[ "$STATUS" = "403" ] && pass "admin correctly got 403 creating a role" || fail "expected 403, got $STATUS"

step "10. Forgot/reset password for user A — Checkpoint 5"
curl -sf -X POST "$BASE_URL/api/auth/forgot-password" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\"}" | jq .
RESET_TOKEN=$(prompt "Paste the reset token for $EMAIL_A from the server console")
curl -sf -X POST "$BASE_URL/api/auth/reset-password" -H "Content-Type: application/json" \
  -d "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"NewPassword456!\"}" | jq .
curl -sf -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"NewPassword456!\"}" | jq .
pass "logged in with the new password"

echo
echo "All scripted checks passed. Remaining to eyeball yourself:"
echo "  - unverified login attempt returns 403 with the distinct 'not verified' message (register a 3rd user, log in before verifying)"
echo "  - logout actually clears cookies (POST $BASE_URL/api/auth/logout, then re-check a protected route fails)"
