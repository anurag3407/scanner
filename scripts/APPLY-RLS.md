# Applying the RLS lockdown to production

## What this changes

Your Supabase project currently runs **blanket policies** — anyone holding the
publishable key can read, modify and delete every row in `stores`, `feedbacks`
and `scan_events`. That includes each store's `manager_email` and
`manager_phone`.

`npm run check:rls:policies` reports this as 7 problems.

The migration replaces those with:

| Table | Anonymous access after |
|---|---|
| `stores` | denied (no SELECT) |
| `team_members` | denied (creates the table if absent) |
| `feedbacks` | INSERT only |
| `scan_events` | INSERT only |

Your server keeps full access via `SUPABASE_SECRET_KEY`, which bypasses RLS.

## Before you start

- The migration is **transactional**: if anything fails, nothing is applied.
- It is **idempotent**: re-running is safe.
- The diner flow (1-3 star complaints, scan telemetry) is verified to keep
  working by `npm run test:rls` (12 checks against a real Postgres).
- It also creates `team_members` if missing. Your console already works without
  it — the table is only needed once you invite store admins.

## Take a backup first

```bash
pg_dump "$DATABASE_URL" -Fc -f ~/credo-$(date +%Y%m%d-%H%M).dump
```

## Run it

```bash
cd /Users/jarvis/scanner
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
  node scripts/setup-supabase.cjs
```

The password is in Supabase → Project Settings → Database → Connection string.
Use the **session pooler** host (`aws-0-<region>.pooler.supabase.com`) if the
direct host refuses IPv4 connections, and port 5432 (not 6543).

## Verify

```bash
npm run check:rls:policies    # must print "policy shape looks locked down"
```

Then confirm the product still works:

1. Open a live QR URL (`/r/<slug>`) and submit a 1-star complaint — it should
   reach the firewall inbox.
2. Load `/admin/feedback` — the complaint should appear.
3. Check `feedbacks` and `scan_events` have new rows.

## If something breaks

The migration is transactional, so a failure leaves the database untouched.
Restore from the dump with:

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists ~/credo-<timestamp>.dump
```
