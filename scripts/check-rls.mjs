/**
 * READ-ONLY Row Level Security audit against a live Supabase project.
 *
 * SAFETY: this script issues ONLY GET requests. It never POSTs, PATCHes or
 * DELETEs, because a probe that "looks harmless" can still destroy production
 * data (PostgREST's `Prefer: count=exact` on a DELETE still performs the
 * delete — that mistake cost a real store row once).
 *
 * It answers one question: what can a caller holding ONLY the publishable
 * (anon) key reach?
 *
 * SCOPE — read this before treating a hit as an internet breach. As of the
 * audit that produced this script, `lib/supabase.ts` reads ONLY
 * SUPABASE_SECRET_KEY / SUPABASE_SECRET_SERVICE_ROLE_KEY, and no client
 * component imports it, so the publishable key is NOT inlined into any client
 * bundle (verified against .next/static). The anon key is therefore a
 * LEAKED CREDENTIAL risk — reachable by anyone who obtains .env — not a
 * public internet exposure.
 *
 * It becomes an internet exposure the moment a client component queries
 * Supabase directly, or a NEXT_PUBLIC_* Supabase var is referenced from client
 * code. Treat a hit here as "rotate and lockdown", and re-check this scope
 * assumption whenever client-side data access changes.
 *
 * Usage: node scripts/check-rls.mjs          (reads .env.local)
 *        npm run check:rls
 */
import { readFileSync } from "node:fs";

function loadEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...loadEnv(".env") };
const BASE = (env.SUPABASE_URL || "").replace(/\/$/, "") + "/rest/v1/";
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!BASE.startsWith("https://") || !ANON) {
  console.error("Set SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
  process.exit(2);
}

const TABLES = ["stores", "team_members", "feedbacks", "scan_events", "menu_items"];

// Columns that must never be readable by an anonymous caller.
const PII_COLUMNS = ["manager_email", "manager_phone", "seo_keywords"];

let problems = 0;
const note = (m) => { problems++; console.log("  FAIL " + m); };
const ok = (m) => console.log("  ok   " + m);

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { apikey: ANON, Authorization: "Bearer " + ANON },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* leave null */ }
  return { status: res.status, json, text };
}

console.log(`Auditing anon access at ${BASE}\n`);

console.log("1. Table exposure (anon key)");
const exposure = {};
for (const t of TABLES) {
  const r = await get(`${t}?select=*&limit=1`);
  exposure[t] = r.status;
  if (r.status === 200) {
    const n = Array.isArray(r.json) ? r.json.length : 0;
    // A table the anon role may legitimately write to (the diner flow) will
    // still answer a SELECT with 401 once SELECT has been revoked, which is
    // the intended end state — not a finding.
    const expectedDenied = ["stores", "team_members", "feedbacks", "scan_events", "menu_items"];
    if (expectedDenied.includes(t)) {
      note(`${t} is readable by anon — the lockdown is NOT applied`);
    } else {
      ok(`${t}: readable (${n} row(s))`);
    }
  } else if (r.status === 401 || r.status === 403) {
    ok(`${t}: denied to anon (${r.status})`);
  } else if (r.status === 404) {
    console.log(`  --   ${t}: MISSING from the database (migration not applied?)`);
  } else {
    note(`${t}: unexpected status ${r.status} - ${r.text.slice(0, 80)}`);
  }
}

console.log("\n2. PII readable by anon");
if (exposure.stores === 200) {
  const r = await get("stores?select=" + PII_COLUMNS.join(",") + "&limit=10");
  const rows = Array.isArray(r.json) ? r.json : [];
  const leaked = PII_COLUMNS.filter((c) => rows.some((row) => row[c]));
  if (leaked.length) {
    note(
      `stores exposes ${leaked.join(", ")} to any holder of the publishable key` +
        " (leaked-credential risk; NOT internet-facing while lib/supabase.ts" +
        " stays server-only — see the SCOPE note at the top of this file)"
    );
    for (const row of rows.slice(0, 3)) {
      console.log(`         e.g. ${row.manager_email || row.manager_phone || "(no owner on this row)"}`);
    }
  } else {
    ok("no owner PII returned by an anon read of stores");
  }
} else {
  console.log("  --   stores is not anon-readable; PII check skipped");
}

console.log("\n3. Tenant data readable by anon");
for (const t of ["team_members", "feedbacks"]) {
  if (exposure[t] === 200) {
    const r = await get(`${t}?select=*&limit=5`);
    const n = Array.isArray(r.json) ? r.json.length : 0;
    if (n > 0) note(`${t} returned ${n} row(s) to an anonymous caller`);
    else ok(`${t} readable but empty (no data exposed yet)`);
  } else if (exposure[t] === 404) {
    console.log(`  --   ${t} does not exist`);
  } else {
    ok(`${t} is not anon-readable`);
  }
}

console.log("\n" + (problems === 0
  ? "RESULT: no anon exposure detected"
  : `RESULT: ${problems} exposure(s) found`));
process.exit(problems === 0 ? 0 : 1);
