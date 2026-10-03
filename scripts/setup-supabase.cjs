/**
 * Creates the ReviewBoost schema in a Supabase Postgres database.
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

-- Indexes that depend on the columns ensured above.
CREATE INDEX IF NOT EXISTS idx_feedbacks_store_id ON public.feedbacks(store_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_store_id ON public.scan_events(store_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_scan_events_timestamp ON public.scan_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_menu_items_store_id ON public.menu_items(store_id, sort_order);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

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
REVOKE ALL ON public.stores, public.team_members, public.menu_items FROM anon, authenticated;

-- Drop any legacy blanket policies before applying the lockdown.
DROP POLICY IF EXISTS "Allow public insert/update stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public read stores" ON public.stores;
DROP POLICY IF EXISTS "Allow public feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow public scan_events" ON public.scan_events;
DROP POLICY IF EXISTS "Allow public team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow public menu_items" ON public.menu_items;

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
