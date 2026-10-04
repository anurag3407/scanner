/**
 * Creates the Credo schema in a Supabase Postgres database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \
 *     node scripts/setup-supabase.cjs
 *
 * The connection string is read from the environment (or from .dev.vars / .env.local
 * if present). Never commit database credentials to this repository.
 *
 * This script only creates/updates the schema. It does not insert any sample data —
 * add real restaurant locations from /admin/stores.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = {
  ...loadEnvFile(".env.local"),
  ...loadEnvFile(".dev.vars"),
  ...process.env,
};

const connectionString =
  env.DATABASE_URL ||
  env.SUPABASE_DB_URL ||
  (env.SUPABASE_URL && env.SUPABASE_DB_PASSWORD
    ? env.SUPABASE_URL.replace("https://", "postgresql://postgres:") +
      `:${env.SUPABASE_DB_PASSWORD}@db.` +
      env.SUPABASE_URL.replace("https://", "").replace(".supabase.co", "") +
      ".supabase.co:5432/postgres"
    : "");

if (!connectionString) {
  console.error(
    [
      "Missing database connection string.",
      "",
      "Set DATABASE_URL (Supabase Dashboard -> Project Settings -> Database -> Connection string)",
      "in your shell or in .dev.vars, then run this script again.",
      "",
      "Example:",
      '  DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \\',
      "    node scripts/setup-supabase.cjs",
    ].join("\n")
  );
  process.exit(1);
}

const client = new Client({
  connectionString,
  // Supabase requires TLS. A local Postgres (used by the test suite) does not,
  // so SSL is opt-out via PGSSLMODE=disable rather than hardcoded.
  ssl:
    (process.env.PGSSLMODE || "").toLowerCase() === "disable"
      ? false
      : { rejectUnauthorized: false },
});

const sql = `
-- Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  category TEXT DEFAULT 'restaurant',
  google_place_id TEXT NOT NULL,
  brand_color TEXT DEFAULT '#f97316',
  accent_color TEXT DEFAULT '#ea580c',
  logo_url TEXT,
  chips JSONB DEFAULT '[]'::jsonb,
  seo_keywords JSONB DEFAULT '[]'::jsonb,
  manager_email TEXT DEFAULT '',
  manager_phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  table_count INTEGER DEFAULT 10,
  review_templates JSONB DEFAULT NULL,
  rating_score NUMERIC(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks Table (Reputation Firewall)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  table_number TEXT,
  customer_name TEXT,
  customer_contact TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  alert JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members Table (super admin -> store admin role-based access)
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'store_admin',
  store_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan Events Table (Telemetry)
CREATE TABLE IF NOT EXISTS public.scan_events (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  chips JSONB DEFAULT '[]'::jsonb,
  review_text TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items Table (live digital menu served on the same QR as the review flow)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(12, 2) DEFAULT 0,
  category TEXT DEFAULT 'Others',
  is_veg BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions Table (billing record)
--
-- Until this existed, a payment could not be recorded anywhere: there was no
-- plan, no amount, no period and no renewal date, so MRR, churn and renewals
-- were all undefined. Amounts are stored in MINOR UNITS of INR (paise) as
-- integers — never as floats — so that MRR arithmetic cannot drift.
--
-- The status column deliberately has no CHECK constraint yet: the enum is still
-- (lead -> trial -> active -> paused -> churned). It is validated in the
-- application layer, and a CHECK here would make adding a value a migration.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'solo',
  status TEXT NOT NULL DEFAULT 'active',
  -- Minor units of INR. 99900 = ₹999.00/month.
  mrr_inr INTEGER NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  -- Customer's GSTIN, required on a B2B tax invoice in India.
  gstin TEXT,
  -- The whole trial: when it started and how many minutes it runs for. There
  -- is no cron that expires it — the application derives entitlement from the
  -- clock, so a worker that stops running cannot leave access switched on.
  trial_started_at TIMESTAMPTZ,
  trial_minutes INTEGER,
  -- The last instant the current paid period covers. Access runs to this
  -- timestamp; a renewal stacks onto whichever is later, now or this value.
  current_period_end TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  -- NULL while the subscription is live; set when it ends so that churn is
  -- measurable rather than inferred from a deleted row.
  ended_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans Table (super-admin-controlled pricing catalogue)
--
-- Prices live in the database, not in code: a super admin edits them from
-- /admin/billing and a change never requires a deploy. A fresh database is
-- seeded once from lib/plans.ts by the application; the row then wins.
-- The price_inr column is an INTEGER count of paise — never a float.
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  price_inr INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  max_locations INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  gst_percent NUMERIC(5, 2) DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons Table (super-admin issued discounts)
--
-- discount_value is interpreted by discount_type: a percent (0-100) or an
-- integer paise amount. There is deliberately no times_redeemed counter —
-- the redemption ledger below is the source of truth, so a retried request
-- cannot consume two slots of a limited coupon.
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  expires_at TIMESTAMPTZ,
  plan_id TEXT,
  store_id TEXT,
  is_active BOOLEAN DEFAULT true,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon Redemptions Table (the ledger that makes redemption limits real)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  store_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  discount_inr INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table (one row per checkout attempt / captured payment)
--
-- The order_id column is the idempotency key: Razorpay may deliver the same
-- event more than once, and the browser callback races the webhook, so every
-- confirmation looks the order up here first. period_ends_at is fixed when the order is
-- created so a replay writes the same period instead of granting a second one.
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  gross_inr INTEGER NOT NULL DEFAULT 0,
  discount_inr INTEGER NOT NULL DEFAULT 0,
  tax_inr INTEGER NOT NULL DEFAULT 0,
  amount_inr INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  -- The buyer's GSTIN, captured at checkout. Kept on the payment so a webhook
  -- confirmation (which carries no browser payload) can still issue the tax
  -- invoice.
  gstin TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  payment_id TEXT,
  period_ends_at TIMESTAMPTZ,
  signature_verified BOOLEAN DEFAULT false,
  confirmed_via TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- Upgrade existing databases created before these additions.
--
-- ORDER MATTERS. "CREATE TABLE IF NOT EXISTS" silently skips a table that
-- already exists, so a database created by an older version of this script
-- (or by a partial failure) can be missing columns the indexes below depend
-- on. Doing the ALTERs first means the indexes always have their columns.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_templates JSONB DEFAULT NULL;
-- Review engine v2: signature keyword pool + draft voice + menu currency.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS signature_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_tone TEXT DEFAULT 'punchy';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
-- Live menu: per-item dish photo link.
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS alert JSONB DEFAULT NULL;
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT '';
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'scan';
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS chips JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'store_admin';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS store_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Billing columns added after the subscriptions table shipped.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_minutes INTEGER;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gstin TEXT;

-- Indexes that depend on the columns ensured above.
CREATE INDEX IF NOT EXISTS idx_feedbacks_store_id ON public.feedbacks(store_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_store_id ON public.scan_events(store_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_scan_events_timestamp ON public.scan_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON public.menu_items(store_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id ON public.subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON public.plans(sort_order);
-- One coupon per code: two rows with the same code and different discounts
-- would make "what does this code do" ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_unique ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
-- One redemption per order: this is the constraint that makes replaying a
-- webhook unable to consume a second slot of a limited coupon.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemptions_order_unique ON public.coupon_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
-- One payment row per gateway order — the idempotency key both confirm paths
-- look the order up by.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_unique ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_id ON public.payments(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy model
-- -------------
-- The Next.js server talks to Postgres through PostgREST using a *secret* key,
-- which bypasses RLS entirely. PostgREST therefore never needs an anon/authenticated
-- policy at all, and granting one would expose every table to anyone holding
-- only the publishable (public) key — including the team directory and the
-- private reputation-firewall complaints.
--
-- The ONLY tables that must stay publicly writable are the two the public diner
-- flow posts to unauthenticated: "feedbacks" (1-3 star complaints) and
-- "scan_events" (telemetry). Those two are INSERT-only and accept nothing but
-- new rows: no SELECT, UPDATE or DELETE from an anonymous client.
--
-- "stores" and "team_members" are admin-only. They have RLS enabled with zero
-- anon/authenticated policies, so an anonymous PostgREST request is denied.
-- Public reads of "stores" go through the Next.js server (which can still read
-- them) — do NOT add a public SELECT policy for stores.
--
-- "menu_items" follows the same model: the diner's menu is public DATA, but it
-- is served through the Next.js server (rate-limited, validated, projected),
-- never straight from PostgREST. Zero anon policies = anon can do nothing.

-- Supabase provisions the anon/authenticated roles. Create them when absent so
-- this script also runs against a plain Postgres (CI, local development).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- Grant the table privileges those roles would have on Supabase. RLS does the
-- actual filtering; without these grants every request is denied outright,
-- which would silently look like "everything works" during testing.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Least privilege. RLS already denies these operations, but granting them
-- means a future policy mistake becomes a live breach instead of a
-- theoretical one. The anonymous role only ever inserts.
GRANT INSERT ON public.feedbacks, public.scan_events TO anon, authenticated;

-- Revoke anything a previous, looser run of this script may have granted.
REVOKE DELETE, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON public.feedbacks, public.scan_events FROM anon, authenticated;
REVOKE SELECT ON public.feedbacks, public.scan_events FROM anon, authenticated;

-- "stores", "team_members" and "menu_items" are server-only. The application
-- reads them with the SECRET key, which bypasses RLS and needs no grant at all,
-- so the anon role is given nothing on them. Every server-side query is a
-- SELECT or a write through SUPABASE_SECRET_KEY, never through PostgREST.
REVOKE ALL ON public.stores, public.team_members, public.menu_items, public.subscriptions FROM anon, authenticated;

-- The commercial tables are the platform's revenue ledger. Only the server
-- (SECRET key, which bypasses RLS) may read or write them: publishing the plan
-- catalogue is a product decision made by the Next.js server, never by an anon
-- PostgREST request, and a coupon table readable by anon would leak every
-- discount code.
REVOKE ALL ON public.plans, public.coupons, public.coupon_redemptions, public.payments FROM anon, authenticated;

-- Drop any legacy blanket policies before applying the lockdown.
DROP POLICY IF EXISTS "Allow public insert/update stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public read stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow public scan_events" ON public.scan_events;
DROP POLICY IF EXISTS "Allow public team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow public plans" ON public.plans;
DROP POLICY IF EXISTS "Allow public coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Allow public payments" ON public.payments;

-- Keep a public read of stores ONLY if a legacy deployment still relies on it
-- being directly readable. Default to locked down.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on stores') THEN
    CREATE POLICY "Deny anon all on stores" ON public.stores FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on team_members') THEN
    CREATE POLICY "Deny anon all on team_members" ON public.team_members FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on menu_items') THEN
    CREATE POLICY "Deny anon all on menu_items" ON public.menu_items FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on subscriptions') THEN
    CREATE POLICY "Deny anon all on subscriptions" ON public.subscriptions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on plans') THEN
    CREATE POLICY "Deny anon all on plans" ON public.plans FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on coupons') THEN
    CREATE POLICY "Deny anon all on coupons" ON public.coupons FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on coupon_redemptions') THEN
    CREATE POLICY "Deny anon all on coupon_redemptions" ON public.coupon_redemptions FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon all on payments') THEN
    CREATE POLICY "Deny anon all on payments" ON public.payments FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert feedback') THEN
    CREATE POLICY "Public insert feedback" ON public.feedbacks FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert scan events') THEN
    CREATE POLICY "Public insert scan events" ON public.scan_events FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END
$$;
`;

async function main() {
  console.log("Connecting to Supabase PostgreSQL...");
  await client.connect();
  console.log("Applying schema...");

  // Wrap the whole migration in an explicit transaction. Without this, a
  // failure part-way through (a missing column, a permission error) can leave
  // the database with SOME of the changes applied — e.g. new tables created but
  // the RLS lockdown never reached. That is the worst possible outcome for a
  // security migration, so it must be all-or-nothing.
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
  console.log("Schema successfully created/verified.");

  const countRes = await client.query("SELECT COUNT(*) FROM public.stores;");
  console.log(`Current stores in Supabase: ${parseInt(countRes.rows[0].count, 10)}`);
  console.log("No sample data is inserted. Add real locations from /admin/stores.");

  await client.end();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
