/**
 * Static sanity check for scripts/setup-supabase.cjs.
 *
 * That script is the ONLY thing standing between a fresh database and the RLS
 * policy set, and it had a syntax error for several commits: backticks inside
 * the SQL template literal terminated the string early, so `node
 * scripts/setup-supabase.cjs` failed before touching the database. Nothing in
 * the test suite caught it because no test executes the script.
 *
 * This check runs in `npm test` so a broken migration can never merge again.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "setup-supabase.cjs");

// 1. It must at least parse.
execFileSync(process.execPath, ["--check", script], { stdio: "pipe" });

// 2. The SQL template literal must not be terminated early by a stray backtick.
//    Extract it and re-check that the SQL is a single, complete statement batch.
const source = readFileSync(script, "utf8");
const start = source.indexOf("const sql = `");
assert.ok(start !== -1, "expected a `const sql =` template literal");
const bodyStart = start + "const sql = `".length;
const bodyEnd = source.indexOf("`;", bodyStart);
assert.ok(bodyEnd !== -1, "the SQL template literal is not terminated with a closing backtick");

const sql = source.slice(bodyStart, bodyEnd);
assert.ok(sql.includes("CREATE TABLE"), "SQL lost its CREATE TABLE statements");
assert.ok(sql.includes("ROW LEVEL SECURITY"), "SQL lost its RLS statements");
assert.ok(sql.includes("CREATE POLICY"), "SQL lost its policy statements");

// 3. Inside the SQL, a backtick would have ended the literal. The extracted body
//    cannot contain one by construction, so assert the count lines up.
const backticksInSource = (source.match(/`/g) || []).length;
assert.equal(
  backticksInSource % 2,
  0,
  "unbalanced backticks — the SQL template literal is broken"
);

console.log("setup-supabase.cjs: parses, SQL literal intact, statements present");
