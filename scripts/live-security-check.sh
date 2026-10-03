#!/usr/bin/env bash
# Live HTTP security check.
#
# The unit/permission suites call route handlers directly in-process, which
# BYPASSES proxy.ts. This script boots a real server and attacks over HTTP so
# the middleware layer, path normalization and response headers are exercised
# for real.
#
# It runs against a temporary JSON store and fake Clerk keys, so it never
# touches production Supabase data or the real Resend key.
#
# Usage: bash scripts/live-security-check.sh
set -uo pipefail

PORT="${PORT:-3999}"
BASE="http://127.0.0.1:$PORT"
BASE_HOST="127.0.0.1:$PORT"
TMP_STORE="$(mktemp -t credo-live-XXXXXX).json"
LOG="/tmp/credo-live.log"
FAILED=0

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null
  rm -f "$TMP_STORE"
  rm -f "$LOG"
}
trap cleanup EXIT

pass() { printf "  \033[32mPASS\033[0m  %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m  %s\n" "$1"; FAILED=$((FAILED+1)); }
check() { # desc, expected, actual
  if [ "$2" = "$3" ]; then pass "$1 ($3)"; else fail "$1 (expected $2, got $3)"; fi
}
# The only statuses that prove an unauthenticated caller was NOT served.
# A protected surface must never answer 2xx. A 3xx redirect to /sign-in is the
# CORRECT protection for pages, so redirects are allowed here; only 2xx is a leak.
not_served() {
  case "$2" in
    2*) fail "$1 (leaked with $2)" ;;
    *) pass "$1 (blocked with $2)" ;;
  esac
}

# Isolate from the developer's real credentials.
mv .env.local /tmp/.env.local.bak.$$ 2>/dev/null
mv .env      /tmp/.env.bak.$$      2>/dev/null
trap 'mv /tmp/.env.local.bak.$$ .env.local 2>/dev/null; mv /tmp/.env.bak.$$ .env 2>/dev/null; cleanup' EXIT

echo "Starting server on $BASE ..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_mock_dummy_publishable_key \
CLERK_SECRET_KEY=sk_mock_dummy_secret_key \
ADMIN_ALLOWED_EMAIL=owner@platform.test \
STORE_DATA_FILE="$TMP_STORE" \
NEXT_PUBLIC_APP_URL="$BASE" \
  npx next dev -p "$PORT" > "$LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done

echo
echo "1. Protected pages must redirect to sign-in"
for p in /admin /admin/stores /admin/team /admin/feedback /admin/analytics \
         /admin/prospectus /admin/stores/x/print /admin/x/print; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")
  if [ "$code" = "307" ] || [ "$code" = "302" ]; then pass "GET $p"; else fail "GET $p (got $code)"; fi
done

echo
echo "2. Protected APIs must return 401"
for p in /api/stores /api/analytics /api/team /api/feedback; do
  check "GET $p" 401 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done
check "PATCH /api/feedback" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H 'Content-Type: application/json' -d '{}' "$BASE/api/feedback")"
check "POST /api/stores" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"name":"x","slug":"x","googlePlaceId":"ChIJx"}' "$BASE/api/stores")"
check "DELETE /api/stores/x" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/stores/x")"

echo
echo "2b. The team directory must be protected by the middleware"
for p in /api/team /api/team/anything; do
  check "GET $p" 401 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done
check "POST /api/team" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.test"}' "$BASE/api/team")"
check "DELETE /api/team/x" 401 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/team/x")"

echo
echo "2c. Forged session cookies must not authenticate"
for cookie in "__session=forged" "__session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyX2ZvcmdlZCJ9.bad" \
              "__client_uat=1" "session_token=admin"; do
  for p in /api/stores /api/team /admin; do
    not_served "cookie '$cookie' -> $p" \
      "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $cookie" "$BASE$p")"
  done
done

echo
echo
echo "2d. Forged Clerk session tokens must not authenticate"
# Mint a genuine RS256 Clerk session token with a locally generated key, then
# have the server TRUST that key via CLERK_JWT_KEY. Even a cryptographically
# valid token must not grant console access, because it does not correspond to
# any user in the Clerk instance. Attacker-signed and alg=none tokens must fail
# outright. This is the last layer no in-process harness can reach, because
# every earlier suite stubbed out @clerk/nextjs/server entirely.
KEYDIR=$(mktemp -d)
node -e "
const crypto=require('crypto'), fs=require('fs');
const a=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
fs.writeFileSync(process.argv[1]+'/good.pem', a.privateKey.export({type:'pkcs8',format:'pem'}));
fs.writeFileSync(process.argv[1]+'/good.pub', a.publicKey.export({type:'spki',format:'pem'}));
const b=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
fs.writeFileSync(process.argv[1]+'/evil.pem', b.privateKey.export({type:'pkcs8',format:'pem'}));
" "$KEYDIR"

mint_token() { # sub keyfile
  node -e "
  const { signJwt } = require('$PWD/node_modules/@clerk/backend/dist/jwt/index.js');
  const fs=require('fs'); const now=Math.floor(Date.now()/1000);
  signJwt({azp:'https://clerk.local',exp:now+3600,iat:now-60,iss:'https://clerk.local',
           nbf:now-60,sid:'s1',sub:process.argv[1]},
          fs.readFileSync(process.argv[2],'utf8'),
          {algorithm:'RS256',audience:[],issuer:'https://clerk.local'}).then(t=>console.log(t));
  " "$1" "$2"
}

# Restart the server so it trusts the local public key.
kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_mock_dummy_publishable_key \
CLERK_SECRET_KEY=sk_mock_dummy_secret_key \
CLERK_JWT_KEY="$(cat "$KEYDIR/good.pub")" \
ADMIN_ALLOWED_EMAIL=owner@platform.test \
STORE_DATA_FILE="$TMP_STORE" \
NEXT_PUBLIC_APP_URL="$BASE" \
  npx next dev -p "$PORT" >>"$LOG" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done

GOOD=$(mint_token "user_local"  "$KEYDIR/good.pem")
EVIL=$(mint_token "user_admin"  "$KEYDIR/evil.pem")
NONE=$(node -e "
  const h=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
  const p=Buffer.from(JSON.stringify({sub:'user_admin',exp:9999999999,iss:'https://clerk.local'})).toString('base64url');
  console.log(h+'.'+p+'.');
")

for name in "valid-signed" "attacker-signed" "alg-none"; do
  case "$name" in
    valid-signed)    tok="$GOOD" ;;
    attacker-signed) tok="$EVIL" ;;
    alg-none)        tok="$NONE" ;;
  esac
  for p in /api/stores /api/team; do
    not_served "$name token -> $p" \
      "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: __session=$tok" "$BASE$p")"
  done
done
rm -rf "$KEYDIR"

echo "3. Path-normalization bypass attempts must not serve data"
for p in "/admin/" "/admin//stores" "/admin/./stores" "/admin%2fstores" "/ADMIN" \
         "/api/stores/" "/api//stores" "/api/./stores" "/api%2fstores" \
         "/api/stores%00" "/api/stores/../stores"; do
  not_served "GET $p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done

echo
echo "3b. Forged forwarding headers must not reach protected data"
# x-forwarded-host is a client-settable header. If the CSRF check trusted it,
# a cross-site mutation could be accepted as same-origin once authenticated.
# Unauthenticated requests are stopped by the proxy before the CSRF gate runs,
# so what is observable here is simply that they never serve data. The CSRF
# behaviour itself is covered by tests/security.test.ts, which drives the check
# directly.
for hdr in "X-Forwarded-Host: evil.example.com" \
           "X-Forwarded-Host: evil.example.com, $BASE_HOST" \
           "X-Forwarded-Proto: https"; do
  for p in /api/stores /api/team; do
    not_served "POST $p with '$hdr'" \
      "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
         -H 'Origin: https://evil.example.com' -H "$hdr" -d '{"name":"x"}' "$BASE$p")"
  done
done

echo
echo "4. Method tampering must not serve data"
not_served "X-HTTP-Method-Override DELETE /api/stores" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'X-HTTP-Method-Override: DELETE' -H 'Content-Type: application/json' -d '{}' "$BASE/api/stores")"
not_served "GET /api/stores?_method=DELETE" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/stores?_method=DELETE")"
not_served "OPTIONS /api/stores" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE/api/stores")"

echo
echo "5. Security headers must be present, x-powered-by absent"
H=$(curl -sI "$BASE/")
for h in content-security-policy x-frame-options x-content-type-options \
         referrer-policy permissions-policy strict-transport-security; do
  printf '%s' "$H" | grep -qi "^$h:" && pass "header $h" || fail "header $h missing"
done
printf '%s' "$H" | grep -qi '^x-powered-by:' && fail "x-powered-by leaked" || pass "x-powered-by absent"

echo
echo "6. Public diner endpoints must still work"
check "POST /api/generate-review" 200 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"storeName":"probe"}' "$BASE/api/generate-review")"

echo
echo "7. Rate limiting on the public telemetry endpoint"
codes=$(for _ in $(seq 1 130); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
    -H 'cf-connecting-ip: 203.0.113.77' -d '{"storeId":"x","type":"scan","rating":5}' "$BASE/api/events"
done)
throttled=$(printf '%s' "$codes" | grep -c '^429$')
[ "$throttled" -gt 0 ] && pass "flood throttled ($throttled requests rejected)" \
                     || fail "flood was never throttled"
check "a different IP is unaffected" 404 \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H 'cf-connecting-ip: 203.0.113.99' -d '{"storeId":"x","type":"scan","rating":5}' "$BASE/api/events")"

echo
echo "8. The public scan page must not carry owner PII"
NODE_ENV=test AUTH_BYPASS_TESTS=true STORE_DATA_FILE="$TMP_STORE" npx tsx -e '
import("@/lib/store").then(async (m) => {
  await m.createStore({
    name: "Leak Canary Bistro", slug: "leak-canary", tagline: "t", category: "Restaurant",
    googlePlaceId: "ChIJcanaryXYZ1234567890ab", brandColor: "#E11D48",
    chips: ["Secret Truffle"], seoKeywords: ["SECRETKEYWORD"],
    managerEmail: "owner-canary@victim.test", managerPhone: "+91-99999-88888",
    address: "1 Canary Road", tableCount: 4,
  });
});' >/dev/null 2>&1

# The server caches its data file in memory, so restart it to pick up the seed.
kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_mock_dummy_publishable_key \
CLERK_SECRET_KEY=sk_mock_dummy_secret_key \
ADMIN_ALLOWED_EMAIL=owner@platform.test \
STORE_DATA_FILE="$TMP_STORE" \
NEXT_PUBLIC_APP_URL="$BASE" \
  npx next dev -p "$PORT" >>"${LOG}" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done

HTML=$(curl -s "$BASE/r/leak-canary")
printf '%s' "$HTML" | grep -qF 'Verified Guest' && pass "scan page renders" || fail "scan page did not render"
for secret in "owner-canary@victim.test" "+91-99999-88888" "SECRETKEYWORD"; do
  printf '%s' "$HTML" | grep -qF "$secret" && fail "LEAKED $secret" || pass "not leaked: $secret"
done
for needed in "Leak Canary Bistro" "ChIJcanaryXYZ1234567890ab" "Secret Truffle"; do
  printf '%s' "$HTML" | grep -qF "$needed" && pass "still present: $needed" || fail "missing: $needed"
done

echo
if [ "$FAILED" -eq 0 ]; then
  echo "RESULT: all live HTTP checks passed"
  exit 0
fi
echo "RESULT: $FAILED live check(s) failed"
exit 1
