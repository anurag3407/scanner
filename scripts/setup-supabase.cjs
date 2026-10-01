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
  ssl: { rejectUnauthorized: false },
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

CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_feedbacks_store_id ON public.feedbacks(store_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_store_id ON public.scan_events(store_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_timestamp ON public.scan_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);

-- Upgrade existing databases created before these additions
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_templates JSONB DEFAULT NULL;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS alert JSONB DEFAULT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- The application talks to the database with the Supabase publishable/secret key
-- through PostgREST, so these tables need policies for that role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read stores') THEN
    CREATE POLICY "Allow public read stores" ON public.stores FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert/update stores') THEN
    CREATE POLICY "Allow public insert/update stores" ON public.stores FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public feedbacks') THEN
    CREATE POLICY "Allow public feedbacks" ON public.feedbacks FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public scan_events') THEN
    CREATE POLICY "Allow public scan_events" ON public.scan_events FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public team_members') THEN
    CREATE POLICY "Allow public team_members" ON public.team_members FOR ALL USING (true);
  END IF;
END
$$;
`;

async function main() {
  console.log("Connecting to Supabase PostgreSQL...");
  await client.connect();
  console.log("Applying schema...");
  await client.query(sql);
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
