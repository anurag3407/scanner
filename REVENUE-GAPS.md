# Revenue Gap Analysis — Credo Scanner

**Date:** 2026-10-04
**Scope:** how this codebase can earn more money, and what is currently stopping it.
**Method:** every claim below is traced to a file and line in the current worktree.

---

## TL;DR

The product works. The **business does not exist in the code**.

> Note: the app has been rebranded to *Credo* across all client and admin surfaces.

Every dollar figure in this repository lives in `PLAN.md` and
`components/ProspectusClient.tsx`. There is **no billing table, no payment SDK,
no checkout, no plan field, and no lead table anywhere** — and there is no path,
for any stranger, to become a customer.

Three numbers frame the whole problem:

| Measure | Actual | Where it appears |
|---|---|---|
| Mechanism by which money can enter the product | **none** | no payment SDK in `package.json:38-49` |
| Paying customers | **0** | no subscription table exists to hold one |
| MRR / churn / LTV computable from data | **no** — undefined, not merely hard | 5 tables, none commercial |

The only revenue ever collected is **a human walking into a restaurant** with a
laminated table tent (`components/ProspectusClient.tsx:521-536`).

**Thirteen gaps found.** Two are security (Gap 0), six are structural blockers on
revenue (Gaps 1-3, 5-7), one is a product-integrity exposure (Gap 4), three are
claims-vs-reality mismatches that are actively *sold* to customers (Gaps 9, 10,
12), and one lets anyone inflate the metric a paying customer buys (Gap 11).
Retention — the third revenue lever — is entirely absent (Gap 13).

The four that decide everything:

1. **No checkout exists** (Gap 1). Nothing else matters until money can enter.
2. **No stranger can become a customer** (Gap 2) — six sequential dead ends.
3. **Sold features that don't exist** (Gaps 9, 12) — Gemini is billed as a $69-tier
   feature but never called; the $199 tier sells white-label standees,
   multi-manager permissions and priority SEO, none of which are implemented.
4. **The owner's headline number is forgeable** (Gap 11) — any anonymous caller can
   increment a store's public review count, and `ratingScore` never updates at all.

**The quantified upside is in "The revenue math, quantified" below:** the entire
distance between ~$4k/yr (the current manual pipeline) and ~$8M/yr is *not product
work* — the product is built. It is six dead ends and a missing checkout.

---

## Gap 0 — A live production credential is committed to git  FIXED

`scripts/seed-50-leads.cjs:11-13` and `scripts/seed-patna-leads.cjs:35-36` both
carried the live Supabase `postgres` **superuser** password inline, as a `||`
fallback — meaning it was the *default* connection whenever `DATABASE_URL` was
unset. Present in git history since commit `a7a16b8`, and the repo has a remote
(`github.com/anurag3407/scanner`).

**Action taken:** removed both fallbacks; the scripts now read `DATABASE_URL`
from the environment only and `process.exit(1)` if it is absent.
Verified: no `pooler.supabase.com` credential remains in any tracked source.

Note on history: only `scripts/seed-50-leads.cjs` was ever committed, so only it
is in git history. `scripts/seed-patna-leads.cjs` is gitignored and never
pushed — that copy was local-only, which is why removing it does not need a purge.

**Still required — a human must do these, I cannot:**
1. **Rotate the Supabase database password.** It must be assumed compromised.
   Until it is rotated, anyone with repo access owns the customer database.
2. **Purge it from git history** (`git filter-repo` / BFG) — removing it from
   `HEAD` does not remove it from `a7a16b8` and `e425fba` and earlier.
3. Check whether the repo is public; if so, assume it was scraped.

Also still in source: the super-admin fallback email at `lib/auth.ts:25`
(`anuragmishra3407@gmail.com`). It grants unrestricted access to every store and
every owner's contact details, and it survives `ADMIN_ALLOWED_EMAIL` being unset.
I left it in place because `tests/permission-bypass.test.ts:928-964` asserts the
fallback behaviour; changing it needs a deliberate decision plus a test update,
not a silent edit.

---

## Gap 1 — There is no way to pay us

**Evidence**
- `package.json:38-49` — no Stripe, Razorpay, Paddle, Lemon Squeezy, or Chargebee.
- `scripts/setup-supabase.cjs:72-285` creates exactly 5 tables: `stores`,
  `feedbacks`, `team_members`, `scan_events`, `menu_items`. **None is commercial.**
- No route anywhere collects payment. All 11 routes under `app/api/` are
  inventory, telemetry, menus, or the reputation firewall.
- `Store` (`lib/types.ts:35-67`) has **no `plan`, no `status`, no `billing` field.**

**Consequence:** MRR, churn, LTV, and net revenue retention are not
"under-instrumented" — they are **undefined**, because no payment is ever recorded.
Every metric on `/prospectus` (`ProspectusClient.tsx:9-16`) is a slider default
(`locationsCount = 350`, `arpu = 69`), computed client-side. The 88% gross margin,
6.6x LTV/CAC, and <2.1% churn figures describe a business that does not yet exist.

**The single highest-leverage change.** Until a store can pay, everything else
is theory.

---

## Gap 2 — No stranger can become a customer (six sequential dead ends)

1. **No acquisition surface.** `components/LandingPageClient.tsx` has no pricing,
   no email field, no "start free", no demo booking, no contact form. Nothing on
   `/` asks a visitor for anything.
2. **No signup.** `app/sign-in/[[...sign-in]]/page.tsx:143` renders `<SignIn>`
   only. There is no `<SignUp>` and no `/sign-up` route.
3. **No way to become a principal.** A signed-in stranger hits
   `lib/auth.ts:180-188` -> `403` "Ask your platform administrator to invite this email".
4. **Invitations are silent and manual.** `app/api/team/route.ts:74-81` writes a DB
   row and sends **no email**. The invitee must independently discover `/sign-in`.
5. **Store creation is operator-only.** `app/api/stores/route.ts:40` calls
   `assertSuperAdmin()`, and it hard-requires a Google Place ID (`:60-65`) that no
   UI can look up — the platform owner hand-copies it.
6. **Then payment does not exist** (Gap 1).

**5 of 15 landing-page CTAs (33%) hit a Clerk wall**, including the largest button
on the page ("Open Admin Console", `LandingPageClient.tsx:583`).

**Verified end state:** a stranger on `/` has no route to becoming a paying
customer. Revenue therefore depends entirely on offline outreach.

---

## Gap 3 — Pricing is invisible, and the tiers are fiction

The three tiers exist **only** in `PLAN.md:73-75` and
`ProspectusClient.tsx:203, 226, 249` — Starter $29, Pro $69, Franchise $199.
That page is titled *"Confidential Investment Prospectus"*. **No restaurant owner
will ever find it, and nothing links to it from `/`.**

Every published limit is unenforced:

| Promise | Source | Reality |
|---|---|---|
| Starter: 1 location, 500 scans/mo | `PLAN.md:73` | No quota of any kind. `/api/events` accepts anonymous scans at 120/min **per IP, forever** (`app/api/events/route.ts:10`). |
| Pro: up to 3 locations | `PLAN.md:74` | No cap. A super admin can create unlimited locations. |
| Franchise: up to 10 locations | `PLAN.md:75` | No cap. |
| "14-day free trial" | `ProspectusClient.tsx:534` | **Pure fiction.** The word "trial" appears once in the codebase — inside a sales script. A rep saying this is fabricating a policy. |

There is also a **currency contradiction**: tiers are priced in **USD** while
every seeded store and default is **INR** (`app/api/stores/route.ts:107`,
`StoreManagementClient.tsx:145`), and the target market per the outreach is India.
`$69` against a Patna cafe is a different product than `$69` in the US.

**The internal inconsistency matters:** `PLAN.md:87` claims each restaurant
generates ~2,400 scans/month, which is **4.8x the Starter cap of 500** — the top
tier's headline customer would be sold a plan it structurally exceeds on day one.

---

## Gap 4 — The pricing model's biggest risk is hiding in plain sight

This one is not in `PLAN.md` and I believe it is the most dangerous item on this page.

`lib/ai.ts:5-19` declares `rating?: number` on `GenerateReviewOptions` — and then
**never uses it.** A repo-wide check confirms `rating` appears exactly once in the
file: in the type declaration.

The consequence:

- `components/CustomerReviewFlow.tsx:37` defaults the diner to **5 stars**.
- `lib/ai.ts:164-215` — the only sentence library in the product — is **entirely
  superlative-positive**: *"Easily a 5/5 star spot"*, *"Five stars without
  hesitation"*, *"10/10 recommend"*.
- So a diner who taps **4 stars** still receives text telling them they gave a
  five-star review.

That is a review-integrity defect, not a copy bug. The product's entire promise is
Google-rating integrity, and the Reputation Firewall (`CustomerReviewFlow.tsx:241`)
only engages at **1–3 stars**. **The 4-star case — the honest, merely-satisfied
diner — is the one case nothing handles.**

It also compounds a larger exposure already flagged in `README.md:15` and
`lib/types.ts:54`: the engine is explicitly built so *"Google's duplicate-spam
filter has nothing to block"* — i.e. the product is architected to defeat review
duplication detection. Combined with pre-written positive text handed to every
diner regardless of their actual experience, that is a platform-integrity
exposure, not just a product bug. **A restaurant owner who gets caught gaming
Google loses their listing — which is the exact thing they are paying us to protect.**

I have not changed this. It is a product decision with legal and commercial
consequences, and it needs your explicit call — see the options at the end.

---

## Gap 5 — Leads and customers are the same table; 100 leads are untracked

There is **no `leads` table.** Every row from `scripts/seed-50-leads.cjs:866` goes
into `public.stores` — so a cold WhatsApp prospect and a live paying tenant are
**indistinguishable rows with identical columns**.

- `restaurants_whatsapp_leads.csv` — **50 leads** (Bangalore 15, Mumbai 12,
  Delhi-NCR 10, Hyderabad 7, Pune 6)
- `patna_restaurants_leads.csv` — **50 leads** (Boring Road 13, Fraser Road 8,
  Bailey Road 5)
- **0 of them persisted anywhere**; they exist only as committed CSVs, with
  per-restaurant live demo URLs and pre-written WhatsApp pitches already built.

> Correction: an earlier draft of this doc said 1,998 leads, from `wc -l`. That is
> wrong — the pitch text embeds newlines, so line count massively overstates row
> count. Parsed with a real CSV reader: **100 leads total.** Corrected here and
> verified.

So there is a genuine 100-entity warm pipeline with personalized outreach already
written — and **no way to know who replied, converted, or churned.** CAC,
conversion rate, and pipeline velocity are all uncomputable.

Even so: 100 hand-researched leads across 6 cities is real distribution work, and
each one already has a working demo URL and a personalised pitch. This is the
single most under-leveraged asset in the repo — it is worth building the `leads`
table around, not replacing.

Worse, the seeded rows are self-fulfilling: all 103 local stores carry
`managerEmail: anuragmishra3407@gmail.com`, `reviewCount: 0` for 100 of 103, and
only 3 have any reviews at all.

**This is why the landing page says "POWERING 103+ LOCATIONS"** — driven by
`app/page.tsx:34`:

```tsx
totalStoresCount={stores.length || 103}
```

The `|| 103` fallback **asserts 103 customers even when the database is empty or
unreachable** (`app/page.tsx:18-22` swallows the error). That is a hardcoded,
falsifiable claim to the public — and a bad look in exactly the review-integrity
market this product sells into.

---

## Gap 6 — Usage data cannot be billed even once billing exists

- `scan_events` has **no usage, period, or quota column** — no `month`, `year_month`,
  `billable`, or `quota` (`scripts/setup-supabase.cjs:123-132`).
- **No retention policy exists.** It is append-only forever.
- `lib/store.ts:769-770` orders **ascending** with `LIMIT 5000`. Past 5,000 events
  — trivially reached at the claimed 2,400 scans/month — **older events silently
  vanish from every query.**
- Writes are best-effort with errors swallowed (`lib/store.ts:735-738`), so
  telemetry **undercounts by design**.

So a scan-based overage meter built on current code would be **structurally
incapable of returning a correct number** past week one. Any usage pricing needs a
rollup table written before it can be trusted.

---

## Gap 7 — Revenue cannot be measured, so it cannot be managed

`app/admin/page.tsx` has no MRR, no churn, no ARPU, no revenue-by-location.
`/admin/prospectus` is a static investor deck that contains **zero lead data** —
the word "prospectus" in this codebase means pitch deck, not CRM.

Deleting a store (`lib/store.ts:516-538`) **erases the customer with no record** —
churn is not merely unmeasured, it is *invisible by construction*.

**Minimum data layer to run this as a business:**
1. `leads` — status, stage, last_touched, outcome, source (replaces the CSVs).
2. `subscriptions` — store_id, plan, status, mrr, started_at, ended_at, cancel_reason -> **unlocks MRR and churn**.
3. `payments` — amount, currency, provider ref, paid_at -> unlocks real revenue.
4. `usage_rollups` — store_id, period_start, scans (+ retention) -> unlocks usage pricing.
5. `stores.plan` + `stores.status` — the cheapest possible MRR proxy.

---

## Gap 8 — Misleading claims, each individually cheap to fix

| Claim | Location | Reality |
|---|---|---|
| "1-tap … pops open Google's direct write-a-review modal" | `LandingPageClient.tsx:415-417` | `handleTestCopy` (`:53-71`) only writes the clipboard and fires confetti. It never opens Google. |
| "POWERING 103+ LOCATIONS ACROSS INDIA" | `LandingPageClient.tsx:533` | Hardcoded `|| 103` fallback; 100 of 103 have zero reviews. |
| `/boost` — "primary conversion engine", marked `[x]` Completed | `PLAN.md:42, 49, 105` | **The route does not exist.** `app/boost/` is absent. |
| Button labelled "Table Standee" | `LandingPageClient.tsx:292-301` | Links to `/r/<id>`, the **diner** scan page, not an admin preview. |
| 88% margin / 6.6x LTV:CAC / <2.1% churn | `PLAN.md:80-83` | Describe revenue that does not exist. |

Trust claims are the product. In a product sold on Google-rating integrity, a
marketing page with a hardcoded customer count is a self-inflicted wound.

---

## Gap 9 — The AI product story doesn't exist  (found on 2nd pass)

`README.md:51` says:

> **AI Engine**: Google Gemini 2.5 Flash / 1.5 Flash with instant 0ms deterministic
> heuristic engine fallback

`README.md:14` says chip re-seeds happen "in under 400ms" via "Gemini 2.5 Flash API
with 1.6s abort controller fallback" (`PLAN.md` repeats this).

**None of that is wired.**

- In application code, the only occurrence of "gemini" in `app/`, `lib/`,
  `components/` is a **TypeScript union member** at `lib/ai.ts:475` —
  `source: "gemini" | "instant_engine"`. There is no
  `generativelanguage.googleapis.com` call, no `GEMINI_API_KEY` read, no abort
  controller anywhere in the runtime path.
- The other occurrence is a **sales claim**: `ProspectusClient.tsx:235` lists
  *"Gemini 2.5 Flash Dynamic Tuning"* as a bullet in the **$69 Pro tier**. So the
  one AI feature that does not exist is being sold as a paid upgrade.
- `generateSmartReview` (`lib/ai.ts:473-483`) — the function whose name promises
  the smart path — **only ever calls `generateOfflineReview`** and always returns
  `source: "instant_engine"`.
- The diner UI imports `generateUniqueReview` (`components/CustomerReviewFlow.tsx:18`),
  which is a pure local function (`lib/ai.ts:411-427`). No network at all.
- **No Gemini key exists in `.env`, `.env.local`, or `.dev.vars`.**
- `app/api/generate-review/route.ts` is **dead code** — nothing in `app/` or
  `components/` ever calls `/api/generate-review`.

**What this means commercially.** Good news first: it validates the cost model.
The engine is genuinely 100% local, so **inference COGS are ~$0**, and the "88%
gross margin" claim in `PLAN.md:80` is achievable *for real* — but by accident,
via a fallback rather than a designed path.

Bad news, and it's larger: **a third of the product's pitch does not exist**, and
two tier descriptions in your own pricing table sell it.

| Claim | Reality |
|---|---|
| "Gemini 2.5 Flash re-seeds under 400ms" | Local template engine, ~0ms, no AI |
| Pro tier: "Gemini 2.5 Flash tuning" | No Gemini, no tuning |
| "AI Engine" in the tech stack | No AI model is called anywhere |

Note this is the **opposite** of the reputation risk in Gap 4 — the product is
*less* automated than advertised, not more. But you cannot demo "AI review
personalisation" to a restaurant owner, and you cannot honestly charge for it,
until either the call is wired or the copy is corrected.

**This is a decision, not a bug** — and it's cheaper than it looks. The local
engine already produces varied drafts (`estimateReviewCombinations`,
`lib/ai.ts:431+`); adding a real Gemini call is one function. Tell me which:
- **(a) Wire it up** — real Gemini path with the local engine as fallback, which
  is what the README already claims. ~1 day.
- **(b) Fix the copy** — drop the AI language from README/PLAN/pricing tiers and
  market it as the instant deterministic engine it actually is. Honest, free, but
  gives up the AI premium positioning.

I'd lean (a) for the Pro/Franchise tiers and (b) everywhere else: sell the AI tier
to the customers who'd pay for it, and don't claim it to the ones who wouldn't.

---

## Gap 10 — The margin was never actually calculated

`PLAN.md:80` asserts **88% gross margin**. Nothing in the repo computes it, and
the real cost stack has never been assembled. For a plan whose entire pitch is
unit economics, this is worth doing properly. The costs that *do* exist:

| Cost | Driver | Notes |
|---|---|---|
| AI inference | **$0 today** | Local engine (Gap 9). Would become real per-call cost the moment Gemini is wired. |
| Supabase Postgres | rows + bandwidth | `scan_events` is **append-only, no retention** (Gap 6). At the claimed 2,400 scans/mo with ~3-5 events per session (1 `scan` + 1 star tap + 1 `copy_open` + N `chip_toggle`; see `CustomerScanExperience.tsx:47`, `CustomerReviewFlow.tsx:138,194,263`), that is **~86k-144k rows/year for a single store, forever**. Per store, per year, compounding. **This is your first real COGS line and it is unbounded.** |
| Resend email | per low-rating alert | `lib/email.ts:178`. Fires on every 1-3 star complaint — your *best* customers generate your *only* outbound cost. |
| Cloudflare Workers | requests | The QR scan page is public and unauthenticated. |

**The insight worth acting on:** `scan_events` growing without bound is a real,
predictable COGS line that is currently invisible. Retention + a rollup table
(Gap 6) is a margin-protection task, not just a housekeeping one.

Also unaddressed: **pricing is in USD while the market and every seeded store are
INR** (Gap 3). At the claimed 6.6x LTV/CAC, currency error is the difference
between a viable business and not one.


---

## Gap 11 — The owner's headline number can be inflated by anyone  (2nd pass, integrity)

This is the most valuable defect found, because it attacks the one metric a
paying customer would actually look at.

`lib/store.ts:740-742` (Supabase) and `:750-754` (local file) increment
`store.reviewCount` **whenever a `copy_open` event is logged** — that is, when a
diner taps "copy".

`POST /api/events` is **public and unauthenticated** (`app/api/events/route.ts:10`).
It accepts any caller-supplied `storeId`, `type` and `rating`. So:

```
POST /api/events
{ "storeId": "<any store>", "type": "copy_open", "rating": 5 }
```

...increments that store's public review count by one. **No session, no CSRF
token, no ownership check** — only a 120/min/IP rate limit
(`app/api/events/route.ts:10`).

Three consequences:

1. **The number is not evidence.** `reviewCount` is presented as the outcome of the
   product, but it counts *copy taps*, not reviews posted on Google. Nothing in
   the product ever verifies with Google that a review exists.
2. **It is adversarially inflatable.** Anyone who has ever scanned the QR — a diner,
   a competitor, a bored teenager — can inflate a competitor's or your own count
   ~7,200/hour from one IP.
3. **It is already wrong in the seeded data.** `ratingScore` is **never updated by
   any code path** — it appears only in the SELECT (`lib/store.ts:210`) and the
   insert map (`:238`); no UPDATE ever writes it. So it is frozen at its creation
   value of `0` (`createStore`, `lib/store.ts:469`) forever.

**Verified against the live data:** of 103 stores, 3 have `reviewCount > 0` but only
**1** has `ratingScore > 0`. The two counters already disagree, and neither reflects
real Google data.

And the repo's own test suite encodes this as intended behaviour —
`tests/store.test.ts:137` is literally named *"logScanEvent records telemetry and
**increments reviewCount on copy_open**"* and passes (11/11 green).

**Why this is a revenue problem, not just a bug:** `reviewCount` is the number the
owner opens `/admin` to see. If it can be inflated by anyone, then the product's
entire proof of value is unverifiable — and a restaurant owner who notices will
churn. It also makes every renewal conversation unsound.

**Fix:** stop deriving a business metric from an anonymous event. Either rename the
field to what it honestly is (`copyEvents`), or reconcile against the Google
Business Profile API (PLAN.md Phase 3 already lists this). At minimum, decouple it
from the public endpoint.

---

## Gap 12 — The $199 tier sells three features that do not exist  (2nd pass)

`components/ProspectusClient.tsx:246-262` sells the Franchise & Agency tier at
$199/mo. Checked each of its four bullets against the code:

| Sold feature | Reality |
|---|---|
| "Up to 10 Locations" | **Unenforceable and unusable.** No cap exists (Gap 3), *and* a paying customer cannot add their own location — `POST /api/stores` requires `assertSuperAdmin()` (`app/api/stores/route.ts:40`). Every additional location is a manual ticket to the platform owner. |
| "White-label table standees" | **Does not exist.** The brand string is hardcoded on the printed artefact (`components/PrintableStandee.tsx:293`). There is no per-store brand-name field, only `brandColor`/`accentColor`. An agency reselling this cannot remove your brand. |
| "Multi-manager role permissions" | **Does not exist.** `UserRole` has exactly two values (`lib/types.ts:1`). `store_admin` gets a flat `storeIds` list (`lib/auth.ts:213-225`) — all-or-nothing across every assigned location, with no per-location or per-capability permission. |
| "Priority local SEO strategy" | **Does not exist.** No SEO feature beyond a `seoKeywords` array that is written to the DB (`app/api/stores/route.ts:96`) and **read by no component at all** — a dead field. |

**This is the most serious *sales* risk in the repo.** A $199/mo customer who
onboards and finds three of four headline features absent has a refund claim and a
public review — from a product whose entire value proposition is protecting a
customer's Google reputation. The $69 tier has the same problem in miniature
("Gemini tuning", Gap 9).

**Note this compounds Gap 2:** the reason a customer *can't* add location #2 is
the same super-admin-only gate that blocks acquisition. One architectural decision
(`POST /api/stores` requiring super-admin) is simultaneously the reason you cannot
sell and cannot expand.

---

## Gap 13 — Retention: the product has no reason to be opened twice  (2nd pass)

Acquisition gets all the attention, but revenue is `new + expansion + retention`,
and the retention loop is **structurally absent**.

- **The product never confirms the outcome.** After a diner copies the review, the
  flow ends at confetti (`components/CustomerReviewFlow.tsx:182-196`). The store is
  never told a review was even *attempted*, let alone posted.
- **No recurring owner communication exists.** No cron, no scheduled job, no digest
  (`wrangler.jsonc`, `open-next.config.ts`, `package.json` all have none). The only
  outbound email is the low-rating alert (`lib/email.ts:178`) — i.e. **you only ever
  contact a customer when something goes wrong.**
- **The owner-facing metrics are the forgeable ones from Gap 11.** The dashboard
  shows activity, but activity is unverified and inflatable.
- **`ratingScore` never moves** (Gap 11), so a real improvement in a store's Google
  rating — the entire promised outcome — is invisible in the product.

**Why this caps revenue:** a restaurant owner renews when the product visibly
works. Right now the product cannot demonstrate that a review was posted, cannot
show the rating improving, and only emails them about complaints. The monthly
renewal moment has nothing to show.

**The cheapest fix with the biggest retention effect:** a weekly owner digest —
"12 scans, 8 reviews copied, 2 complaints resolved, your Google rating is 4.6"
— which requires only a scheduled job and one template. It also creates a reason to
*open* the console rather than a reason to leave it.

## The revenue math, quantified

Every input below is taken from the repo's own published figures (`PLAN.md:73-87`,
`ProspectusClient.tsx:203-249`, ARPU $69). The point is not to forecast — it is to
show which single change moves the number most.

### Today

```
Strangers who can pay:          0   (no checkout, no signup, no pricing page)
Paying customers:               0   (no subscription table exists)
MRR:                           $0
```

The product has 103 seeded demo locations, 0 of which are customers. **Everything
above $0 requires a change to the code.**

### The only revenue that exists today: offline outreach

100 hand-researched leads. With a working per-lead demo URL and a personalised
pitch already written, cold-WhatsApp-to-restaurant closes badly but not at zero:

| Close rate | Customers | MRR @ $69 | ARR |
|---|---|---|---|
| 2% (cold WhatsApp) | 2 | $138 | $1,656 |
| 5% (warm — demo URL already built) | 5 | $345 | $4,140 |

This is the **entire** current business, and it is entirely manual.

### The prize, if the funnel is built

| Paying stores | MRR @ $69 | ARR |
|---|---|---|
| 100 | $6,900 | $82,800 |
| 1,000 | $69,000 | $828,000 |
| 10,000 | $690,000 | $8,280,000 |
| 90,000 (`PLAN.md:82` SOM) | $6,210,000 | **$74,520,000** |

**The order-of-magnitude finding:** the entire gap between ~$4k/yr and ~$8M/yr is
**not product** — the product is built. It is the six dead ends in Gap 2 plus the
missing checkout in Gap 1. That is the whole thesis.

### The margin works — if you stop lying about it

- AI inference is **$0** today, because the engine is fully local (Gap 9). That is
  a genuinely excellent cost position, and it makes the 88% margin claim
  *achievable* — just for different reasons than the doc states.
- The real cost is `scan_events` growth (Gap 10): **~86k–144k rows/year per store,
  append-only, with no retention.** At 1,000 stores that's **86M–144M rows/year
  and compounding forever.** This is the line item that will eventually break the
  margin, and today nobody is watching it.
- Resend spend scales with *complaints*, so your best-engaged customers are the
  ones generating outbound cost (`lib/email.ts:178`).

### Currency

Tiers are priced in **USD**; the market, the seeded stores, and all 100 leads are
**INR**. At these margins a currency error is existential, and it is unaddressed.

---

## Where the leverage is, ranked

| # | Change | Revenue effect | Cost | Blocked on |
|---|---|---|---|---|
| 1 | Checkout + `plan` on `Store` (Gap 1) | **Unblocks 100% of revenue.** Nothing else matters first. | days | payment provider account |
| 2 | Public `/pricing` + landing CTA (Gap 2, 3) | Makes the price discoverable to buyers | hours | — |
| 3 | `leads` table + import 100 leads (Gap 5) | Makes the existing pipeline measurable & followable | ~1 day | — |
| 4 | Real store count (Gap 5) | Removes a falsifiable claim | minutes | — |
| 5 | Fix false claims (Gap 8) | Trust, in an integrity product | hours | — |
| 6 | Self-serve signup + Place ID lookup (Gap 2) | Removes the operator bottleneck on every sale | ~2 days | Clerk config |
| 7 | `subscriptions` + MRR on `/admin` (Gap 7) | Makes it a business you can run | ~1 day | #1 |
| 8 | `usage_rollups` + retention (Gap 6, 10) | Protects the margin | ~1 day | — |
| 9 | Wire Gemini or fix the copy (Gap 9) | Makes a sold AI feature real | ~1 day | your call |
| 10 | **Stop letting `/api/events` set `reviewCount`** (Gap 11) | Makes the sold metric trustworthy | hours | — |
| 11 | Build the $199 tier, or stop selling it (Gap 12) | Removes a refund/liability exposure | days, or copy | your call |
| 12 | Weekly owner digest (Gap 13) | Creates the renewal moment | ~1 day | #1 |

**The honest summary:** items 1–3 are the entire revenue unlock and cost about a
week. Items 4–5 cost an afternoon and protect trust. Items 9, 11 are positioning
decisions. **Item 10 is the urgent one** — you are currently charging for a metric
that any diner can inflate, and item 11 means the $199 tier could be sold against
features that don't exist.

Nothing on this list requires new product engineering.

### The revenue levers, honestly assessed

| Lever | State today | Blocks |
|---|---|---|
| **Acquisition** | No pricing page, no signup, no checkout (Gaps 1–3) | All new revenue |
| **Expansion** | A $199 customer cannot add location #2 without emailing you (Gap 12) | All net-new + upgrade revenue |
| **Retention** | No outcome confirmation, no digest, no rating movement, forgeable metric (Gaps 11, 13) | All recurring revenue |

All three levers are broken. Acquisition is the obvious one and the easiest to fix,
but **retention is the quiet one**: even if you fixed checkout tomorrow, a customer
who renews has no reason to keep the product open, and cannot see whether it worked.


## What I'd do, in order

**This week — stops active bleeding**
1. Rotate the Supabase password (Gap 0). *Blocked on you — needs the dashboard.*
2. Replace `stores.length || 103` with the real count (`app/page.tsx:34`).
3. Fix the two false landing-page claims (Gap 8).
4. Decide Gap 4 — see below.

**Next — makes money possible**
5. Add a payment provider + `plan`/`status` on `Store`, and a checkout route.
6. Make the published limits real, and fix the Starter-cap-vs-2,400-scans
   contradiction (Gap 3).
7. Add a public `/pricing`; move the tiers off the investor deck.
8. Self-serve signup: `/sign-up` (Clerk `<SignUp>`) + let a new owner create
   their own store, with automated Google Place ID lookup replacing hand-copying.

**Then — makes it measurable**
9. `leads` table, and import the 100 CSV leads with a stage per row.
10. `subscriptions` + `payments`, then MRR/churn on `/admin`.
11. `usage_rollups` before any usage-based pricing.

---

## The one decision I need from you

**Gap 4 is a fork in the road, and it is a business decision, not a technical one.**

Today the product hands every diner positive text regardless of the stars they
actually tap. That maximises short-term review volume, and it is also the thing
most likely to get a paying customer in trouble with Google. Options:

- **(a) Honest-text product.** Generate text that matches the star rating, and
  have the Reputation Firewall engage at 1–3 with honest text elsewhere. Slightly
  fewer 5-stars, materially lower integrity risk, and the "4-star" gap disappears.
- **(b) Keep volume, formalize the offer.** Rename the product around *review
  response capture* — the value becomes surfacing and resolving complaints
  privately, not maximising stars. Defensible, but needs a marketing rewrite.
- **(c) Status quo.** I don't recommend this — it is the version where the
  product's integrity promise is contradicted by its own code.

Tell me which, and I'll build the funnel around it.

---
