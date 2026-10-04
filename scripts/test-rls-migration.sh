#!/usr/bin/env bash
# End-to-end verification of scripts/setup-supabase.cjs against a real Postgres.
#
# WHY THIS EXISTS
# ---------------
# The RLS lockdown is the only thing between an anonymous caller and every
# store's owner email and phone. It had never been executed end-to-end: a
# backtick in a SQL comment broke the script, and once fixed, the statement
# ORDER was wrong so it aborted before reaching the policies at all. Neither
# was caught by any unit test, because nothing ran the migration.
#
# This boots a throwaway cluster and asserts the full behaviour matrix:
#   anon SELECT/UPDATE/DELETE -> blocked
#   anon INSERT into team_members -> blocked
#   anon INSERT into feedbacks / scan_events -> ALLOWED (the product)
#   the server's privileged role -> full access
#
# NOTE ON METHOD (learned the hard way, three turns of false conclusions):
#   - An RLS SELECT that matches nothing does NOT error; it returns 0 rows.
#     Assert on ROW COUNT, never on "did it raise".
#   - Run ONE statement per connection. Chaining with RETURNING or a trailing
#     SELECT makes the reported error belong to a different command.
set -uo pipefail

PG_BIN="${PG_BIN:-}"
if [ -z "$PG_BIN" ]; then
  for c in /opt/homebrew/opt/postgresql@15/bin /usr/lib/postgresql/*/bin /usr/local/pgsql/bin; do
    if [ -x "$c/initdb" ]; then PG_BIN="$c"; break; fi
  done
fi
if [ -z "$PG_BIN" ] || [ ! -x "$PG_BIN/initdb" ]; then
  echo "SKIP: no PostgreSQL binaries found (set PG_BIN)"
  exit 0
fi
export PATH="$PG_BIN:$PATH"

PGDATA="$(mktemp -d)/pg"
PORT="${PG_TEST_PORT:-15499}"
SOCK="$(mktemp -d)"
FAILURES=0

cleanup() {
  if [ -n "${PGPID:-}" ]; then pg_ctl -D "$PGDATA" stop -m immediate >/dev/null 2>&1; fi
  rm -rf "$(dirname "$PGDATA")" "$SOCK"
}
trap cleanup EXIT

pass() { printf "  \033[32mPASS\033[0m  %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m  %s\n" "$1"; FAILURES=$((FAILURES + 1)); }

initdb -D "$PGDATA" -A trust -U postgres --no-sync >/dev/null 2>&1
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$PGDATA/server.log" start >/dev/null 2>&1
for _ in $(seq 1 30); do
  psql -h "$SOCK" -p "$PORT" -U postgres -tAc "SELECT 1" >/dev/null 2>&1 && break
  sleep 1
done
psql -h "$SOCK" -p "$PORT" -U postgres -q -c "CREATE DATABASE rls_verify;" >/dev/null 2>&1

DBURL="postgresql://postgres@localhost/rls_verify?host=$SOCK&port=$PORT"
echo "Applying the migration..."
if PGSSLMODE=disable DATABASE_URL="$DBURL" node scripts/setup-supabase.cjs >/dev/null 2>&1; then
  pass "migration applies cleanly"
else
  fail "migration failed to apply"
  exit 1
fi

# The migration must be all-or-nothing. A failure part-way through must not
# leave the database with new tables but no RLS lockdown.
echo "A failed migration must roll back completely"
cp scripts/setup-supabase.cjs "$PGDATA/setup-supabase.cjs.bak"
python3 - "$PGDATA/setup-supabase.cjs.bak" scripts/setup-supabase.cjs <<'PY'
import sys
src = open(sys.argv[2]).read()
# Append a statement that cannot succeed, after the policies would have applied.
open(sys.argv[1], "w").write(src.replace("\nawait client.query(sql);", "\nawait client.query(sql);\nawait client.query(\"SELECT * FROM table_that_does_not_exist\");", 1))
PY
psql -h "$SOCK" -p "$PORT" -U postgres -q -c "DROP DATABASE IF EXISTS tx_rollback;" -c "CREATE DATABASE tx_rollback;" >/dev/null 2>&1
if PGSSLMODE=disable DATABASE_URL="postgresql://postgres@localhost/tx_rollback?host=$SOCK&port=$PORT" \
     node "$PGDATA/setup-supabase.cjs.bak" >/dev/null 2>&1; then
  fail "sabotaged migration unexpectedly succeeded"
else
  pass "sabotaged migration fails as expected"
fi
left=$(psql -h "$SOCK" -p "$PORT" -U postgres -d tx_rollback -X -tA \
        -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';" 2>&1 | tr -d '[:space:]')
pol=$(psql -h "$SOCK" -p "$PORT" -U postgres -d tx_rollback -X -tA \
       -c "SELECT count(*) FROM pg_policies WHERE schemaname='public';" 2>&1 | tr -d '[:space:]')
if [ "$left" = "0" ] && [ "$pol" = "0" ]; then
  pass "failed migration left no tables and no policies behind"
else
  fail "failed migration left partial state (tables=$left policies=$pol)"
fi
psql -h "$SOCK" -p "$PORT" -U postgres -q -c "DROP DATABASE IF EXISTS tx_rollback;" >/dev/null 2>&1
echo

psql -h "$SOCK" -p "$PORT" -U postgres -d rls_verify -q \
  -c "INSERT INTO stores (id,slug,name,google_place_id) VALUES ('s1','a','A','ChIJa');" \
  -c "INSERT INTO feedbacks (id,store_id,store_name,rating,message) VALUES ('seed','s1','A',1,'m');" \
  -c "INSERT INTO team_members (id,email,role,store_ids,status) VALUES ('m1','gm@a.test','store_admin','[\"s1\"]','active');" \
  -c "CREATE ROLE diner LOGIN;" \
  -c "GRANT anon TO diner;" >/dev/null 2>&1

# runs <expected> <label> <sql>  — one statement per connection.
# runs <expected> <label> <sql>  — ONE statement per connection.
#
# Expectations are matched against the row count psql prints, not against
# "did it raise": an RLS SELECT that matches nothing returns 0 rows silently,
# and an UPDATE/DELETE that RLS filters out reports "UPDATE 0" rather than an
# error. Only a genuine refusal shows up as ERROR.
runs() {
  local expect="$1" label="$2" sql="$3" out
  out="$(psql -h "$SOCK" -p "$PORT" -U diner -d rls_verify -X -tA -c "$sql" 2>&1 | head -1)"
  out="$(printf '%s' "$out" | tr -d '[:space:]')"
  case "$expect" in
    ALLOW)
      # A successful INSERT prints "INSERT 0 1"; a successful SELECT prints a count.
      [[ "$out" == INSERT01 ]] && pass "$label" || fail "$label (got: ${out:0:60})" ;;
    DENY)
      [[ "$out" == ERROR* ]] && pass "$label" || fail "$label (got: ${out:0:60})" ;;
    ZERO)
      # A protected table can be blocked two ways, and both are correct:
      #   - RLS returns 0 rows / "UPDATE 0" (the role holds the privilege,
      #     the policy filters it), or
      #   - the privilege itself was revoked, so the statement errors with
      #     "permission denied".
      # Anything other than "the caller saw zero rows / touched zero rows" is
      # a genuine leak.
      if [[ "$out" == 0 || "$out" == UPDATE0 || "$out" == DELETE0 ]]; then
        pass "$label (RLS)"
      elif [[ "$out" == ERROR*permissiondenied* ]]; then
        pass "$label (no privilege)"
      else
        fail "$label (got: ${out:0:60})"
      fi ;;
  esac
}

echo "Reads must be blocked"
runs ZERO "anon SELECT stores -> 0 rows"        "SELECT count(*) FROM public.stores;"
runs ZERO "anon SELECT team_members -> 0 rows"  "SELECT count(*) FROM public.team_members;"
runs ZERO "anon SELECT menu_items -> 0 rows"    "SELECT count(*) FROM public.menu_items;"
runs ZERO "anon SELECT subscriptions -> 0 rows" "SELECT count(*) FROM public.subscriptions;"
runs ZERO "anon SELECT plans -> 0 rows"         "SELECT count(*) FROM public.plans;"
runs ZERO "anon SELECT coupons -> 0 rows"       "SELECT count(*) FROM public.coupons;"
runs ZERO "anon SELECT payments -> 0 rows"      "SELECT count(*) FROM public.payments;"
runs ZERO "anon SELECT coupon_redemptions -> 0 rows" "SELECT count(*) FROM public.coupon_redemptions;"

echo "Writes that must be blocked"
runs ZERO "anon UPDATE stores -> 0 rows"         "UPDATE public.stores SET name='pwn';"
runs ZERO "anon DELETE stores -> 0 rows"         "DELETE FROM public.stores;"
runs DENY "anon INSERT team_members -> denied"   "INSERT INTO public.team_members (id,email,role) VALUES ('evil','e@e.test','super_admin');"
runs DENY "anon INSERT subscriptions -> denied"  "INSERT INTO public.subscriptions (id,store_id,plan,mrr_inr) VALUES ('evil','s1','agency',999900);"
runs ZERO "anon UPDATE subscriptions -> 0 rows"  "UPDATE public.subscriptions SET mrr_inr=0;"
runs DENY "anon INSERT plans -> denied"          "INSERT INTO public.plans (id,name,price_inr) VALUES ('evil','Evil',1);"
runs DENY "anon INSERT coupons -> denied"        "INSERT INTO public.coupons (id,code,discount_type,discount_value) VALUES ('evil','FREE100','percent',100);"
runs DENY "anon INSERT payments -> denied"       "INSERT INTO public.payments (id,store_id,order_id,plan_id) VALUES ('evil','s1','order_x','solo');"
runs DENY "anon INSERT coupon_redemptions -> denied" "INSERT INTO public.coupon_redemptions (id,coupon_id,code,store_id,plan_id,order_id) VALUES ('evil','c','FREE100','s1','solo','order_x');"
runs ZERO "anon UPDATE payments -> 0 rows"       "UPDATE public.payments SET amount_inr=0;"
runs ZERO "anon UPDATE coupons -> 0 rows"        "UPDATE public.coupons SET discount_value=100;"

# The trial window lives on the subscriptions row. A database migrated from an
# older script must actually have these columns or the entitlement maths fails.
cols=$(psql -h "$SOCK" -p "$PORT" -U postgres -d rls_verify -X -tA \
       -c "SELECT count(*) FROM information_schema.columns WHERE table_name='subscriptions' AND column_name IN ('trial_started_at','trial_minutes','current_period_end');" | tr -d '[:space:]')
if [ "$cols" = "3" ]; then
  pass "subscriptions carries the trial + period columns"
else
  fail "subscriptions is missing trial/period columns (found $cols of 3)"
fi

echo "The public diner flow must keep working"
runs ALLOW "anon INSERT feedbacks -> allowed"     "INSERT INTO public.feedbacks (id,store_id,store_name,rating,message) VALUES ('v1','s1','A',1,'cold food');"
runs ALLOW "anon INSERT scan_events -> allowed"   "INSERT INTO public.scan_events (id,store_id,type,rating) VALUES ('v1','s1','scan',5);"

echo "The server's own privileged role is unaffected"
if [ "$(psql -h "$SOCK" -p "$PORT" -U postgres -d rls_verify -X -tAc 'SELECT count(*) FROM public.team_members;' | tr -d '[:space:]')" = "1" ]; then
  pass "privileged role reads the team directory"
else
  fail "privileged role lost access"
fi
if [ "$(psql -h "$SOCK" -p "$PORT" -U postgres -d rls_verify -X -tAc "SELECT count(*) FROM public.feedbacks;" | tr -d '[:space:]')" -ge 2 ]; then
  pass "privileged role sees the diner complaints that were submitted"
else
  fail "diner complaints were not persisted"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "RESULT: RLS migration verified end-to-end"
  exit 0
fi
echo "RESULT: $FAILURES check(s) failed"
exit 1
