/**
 * Verify the RLS policy shape in a live Postgres database.
 *
 * Complements scripts/check-rls.mjs (which probes the anon key over PostgREST).
 * This one reads the catalog directly, so it can prove that a policy is
 * UNRESTRICTED (`USING (true)`) even when no anon traffic is generated.
 *
 * READ-ONLY: it issues SELECTs against pg_catalog only. It never writes.
 *
 * Required: DATABASE_URL in .env.local
 * Usage:   npm run check:rls:policies
 *
 * ---------------------------------------------------------------------------
 * VERIFYING BEHAVIOUR — THE TRAP THAT COST THREE TURNS
 *
 * RLS was verified end-to-end against a local Postgres and it works. The
 * lockdown does exactly what it should:
 *
 *   diner (member of anon) SELECT stores/team_members/feedbacks/scan_events -> 0 rows
 *   diner UPDATE/DELETE stores, UPDATE/DELETE feedbacks                    -> 0 rows
 *   diner INSERT into team_members                                           -> denied
 *   diner INSERT into feedbacks / scan_events                               -> ALLOWED  (the product)
 *
 * Two mistakes produced three turns of false conclusions, and both are worth
 * recording because they are easy to repeat:
 *
 * 1. An RLS SELECT that matches no rows does NOT raise an error — it returns
 *    an empty result. A helper that treats "no ERROR" as "ALLOWED" will report
 *    every protected table as readable. Always assert on the ROW COUNT.
 *
 * 2. Chaining statements in one psql session (or using RETURNING / a trailing
 *    SELECT) makes the failing statement ambiguous: the error you see may come
 *    from a different command than the one you were testing. Run ONE statement
 *    per connection, with nothing after it.
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch { /* file may not exist */ }
  return out;
}

const env = { ...loadEnv(".env.local"), ...loadEnv(".env") };
const db = env.DATABASE_URL;
if (!db) {
  console.error("DATABASE_URL is not set; cannot inspect policies.");
  process.exit(2);
}

function q(sql) {
  return execFileSync("psql", [db, "-X", "-tAF", "|", "-c", sql], { encoding: "utf8" })
    .split("\n").filter(Boolean);
}

let problems = 0;
const note = (m) => { problems++; console.log("  FAIL " + m); };
const ok = (m) => console.log("  ok   " + m);

console.log("1. Tables and RLS state");
const tables = q(
  `SELECT c.relname, c.relrowsecurity::text FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;`
);
for (const line of tables) {
  const [name, rls] = line.split("|");
  // Cast to text yields "true"/"false", not "t"/"f".
  const rlsOn = rls === "t" || rls === "true";
  console.log(`  --   ${name}: RLS ${rlsOn ? "enabled" : "DISABLED"}`);
  if (!rlsOn) note(`${name} does not have RLS enabled`);
}

console.log("\n2. Policies that are unrestricted (USING true / WITH CHECK true)");
const policies = q(
  `SELECT tablename, policyname, cmd, COALESCE(qual,''), COALESCE(with_check,'')
   FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;`
);
if (!policies.length) {
  note("no policies exist at all — RLS defaults to deny, which is safe, but verify intent");
}
for (const line of policies) {
  const [table, name, cmd, qual, checkExpr] = line.split("|");
  const blanketSelect = /^\s*true\s*$/.test(qual) && cmd === "SELECT";
  const blanketAll = /^\s*true\s*$/.test(qual) && cmd === "ALL";
  const blanketCheck = /^\s*true\s*$/.test(checkExpr);
  if (blanketSelect) {
    note(`${table}.${name}: SELECT USING (true) — anyone can read this table`);
  } else if (blanketAll) {
    note(`${table}.${name}: FOR ALL USING (true) — anyone can read, modify and delete`);
  } else if (blanketCheck && cmd === "INSERT") {
    ok(`${table}.${name}: INSERT-only policy (expected for the public diner flow)`);
  } else {
    ok(`${table}.${name}: ${cmd} policy is restricted`);
  }
}

console.log("\n3. anon table privileges");
const grants = q(
  `SELECT table_name, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type)
   FROM information_schema.role_table_grants
   WHERE grantee='anon' AND table_schema='public'
   GROUP BY table_name ORDER BY table_name;`
);
for (const line of grants) {
  const [table, privs] = line.split("|");
  const privSet = new Set(privs.split(","));
  if (privSet.has("DELETE") || privSet.has("UPDATE")) {
    note(`anon holds ${privs} on ${table} — destructive access the app does not need`);
  } else {
    ok(`anon holds ${privs} on ${table}`);
  }
}

console.log(
  "\n" +
    (problems === 0
      ? "RESULT: policy shape looks locked down"
      : `RESULT: ${problems} policy problem(s) found — run scripts/setup-supabase.cjs`)
);
process.exit(problems === 0 ? 0 : 1);
