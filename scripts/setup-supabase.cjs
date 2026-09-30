const { Client } = require("pg");

const client = new Client({
  host: "aws-0-ap-northeast-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.arhtyltkjaqptywopcux",
  password: "Anurag@3407",
  database: "postgres",
  ssl: { rejectUnauthorized: false }
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
  rating_score NUMERIC(3, 2) DEFAULT 4.9,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedbacks Table (Reputation Firewall)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  table_number TEXT,
  customer_name TEXT,
  customer_contact TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access via policies
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
END
$$;
`;

async function main() {
  console.log("Connecting to Supabase PostgreSQL pooler...");
  await client.connect();
  console.log("Executing DDL Schema...");
  await client.query(sql);
  console.log("Schema successfully created/verified!");

  // Check store count
  const countRes = await client.query("SELECT COUNT(*) FROM public.stores;");
  const count = parseInt(countRes.rows[0].count, 10);
  console.log(`Current stores in Supabase: ${count}`);

  if (count === 0) {
    console.log("Seeding sample stores into Supabase...");
    const sampleStores = [
      {
        id: "store_luigi_1",
        slug: "luigis-trattoria",
        name: "Luigi's Woodfired Trattoria",
        tagline: "Authentic Neapolitan Pizza & Handmade Pasta",
        category: "Italian",
        google_place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        brand_color: "#f97316",
        chips: JSON.stringify(["Wood-fired Margherita", "Truffle Tagliatelle", "Warm Hospitality", "Cozy Ambience", "Tiramisu", "Express Lunch"]),
        seo_keywords: JSON.stringify(["best neapolitan pizza soho", "handmade truffle pasta", "authentic italian dining"]),
        manager_email: "luigi@trattoria.example.com",
        manager_phone: "+1 (555) 234-5678",
        address: "142 Mercer Street, Soho, NY",
        rating_score: 4.9,
        review_count: 142
      },
      {
        id: "store_sushi_2",
        slug: "omakase-shangri-la",
        name: "Kuro Shinjuku Omakase",
        tagline: "Artisanal Edomae Sushi & Rare Sakes",
        category: "Japanese",
        google_place_id: "ChIJa96j5-hZwokRj8o5K2q_qYk",
        brand_color: "#0ea5e9",
        chips: JSON.stringify(["Otoro Nigiri", "A5 Wagyu Uni Roll", "Chef Kenji", "Matcha Soufflé", "Intimate Counter", "Impeccable Presentation"]),
        seo_keywords: JSON.stringify(["best omakase downtown", "artisan edomae sushi", "rare sake tasting"]),
        manager_email: "kenji@omakase.example.com",
        manager_phone: "+1 (555) 876-5432",
        address: "88 Franklin Street, Tribeca, NY",
        rating_score: 5.0,
        review_count: 98
      },
      {
        id: "store_cafe_3",
        slug: "botanical-brew-co",
        name: "Botanical Brew & Bakehouse",
        tagline: "Micro-Roastery, Natural Sourdough & Specialty Brunch",
        category: "Cafe & Brunch",
        google_place_id: "ChIJ73a7kXhZwokR79u3tU02X38",
        brand_color: "#10b981",
        chips: JSON.stringify(["Signature Cold Brew", "Pistachio Croissant", "Avocado Tartine", "Fast Wifi & Patio", "Friendly Baristas", "Artisan Sourdough"]),
        seo_keywords: JSON.stringify(["specialty coffee brunch", "fresh bakery pastry", "patio cafe work"]),
        manager_email: "hello@botanicalbrew.example.com",
        manager_phone: "+1 (555) 345-6789",
        address: "412 West Broadway, NY",
        rating_score: 4.8,
        review_count: 215
      }
    ];

    for (const store of sampleStores) {
      await client.query(`
        INSERT INTO public.stores (id, slug, name, tagline, category, google_place_id, brand_color, chips, seo_keywords, manager_email, manager_phone, address, rating_score, review_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING;
      `, [
        store.id, store.slug, store.name, store.tagline, store.category, store.google_place_id,
        store.brand_color, store.chips, store.seo_keywords, store.manager_email, store.manager_phone,
        store.address, store.rating_score, store.review_count
      ]);
    }
    console.log("Sample stores seeded successfully!");
  }

  await client.end();
  console.log("Migration complete!");
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
