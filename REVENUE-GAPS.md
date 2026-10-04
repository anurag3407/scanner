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

**Twenty-seven gaps found. Gaps 5, 8, 11, 18, 26 fixed; Gaps 7 and 23 built end-to-end, Gap 25 partly closed (see "What I fixed").** Two are security (Gap 0), six are structural blockers on
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

**Part 2 answers the pricing question** (Gaps 14–18), and the headline is blunt:
**the pricing is built for a market you don't sell to.** `PLAN.md:82` sizes the TAM
as *"1.2M dine-in venues in US & Europe"* while all 100 leads are in India. At
~$85/USD, the $69 tier is ₹5,865/month — **4–12× what Indian restaurants pay for
restaurant software** (CurryIQ lists a full unlimited-branch POS at ₹1,499/mo). And
your $74.5M SOM target is **127% of the entire Indian restaurant-software market**.

Three findings from Part 2 worth acting on immediately:
- **Your live digital menu is priced at zero** (Gap 17) — a fully-built second
  product, in no tier, gated by no plan. Meanwhile Petpooja gives QR ordering +
  feedback away on *every* tier of its POS.
- **The live site makes a "100% Google compliant / prevents Review Gating penalties"
  claim** that the product's own design contradicts (Gap 18).
- **The 100 leads are real and the demos work** — verified live in production.

**Part 3 gives the good news, and it changes the plan** (Gaps 19–21). Modelling the
actual sales motion: **real CAC is ~$18–41, not the "<$250" in `PLAN.md` — an LTV/CAC
of 40–166x**, and still 16x after an 83% price cut to India-realistic pricing. The
plan *understates* its own economics by an order of magnitude.

The consequence is the most important correction in this document: **you do not need
the self-serve funnel to make your first rupee.** At current pricing **9–17 customers
is a ₹6–12L/yr business**; at India pricing ~50. At a 5% close rate that's ~340–1,000
leads and **45–130 founder-hours** — three to seven work-weeks of outreach you already
know how to do. **The gap is ~10× more of the thing that already works, not a new
funnel.** Details in Gap 20.

**Part 4 stress-tests that conclusion and finds the real answer** (Gaps 22–23).
I checked whether any of this has ever been tried. It hasn't:

| | |
|---|---|
| Customers ever signed | **0** (`team_members`: 0) |
| Stores with a real owner's email | **0** (all 103 use the founder's) |
| Leads actually contacted | **0** — the seed script contains no send logic at all |
| Payment SDK / checkout route / `plan` field | **none** |

So the 5% close rate was my assumption. **It survives stress-testing anyway:** even at
a 1% close rate, CAC is $81 and LTV/CAC is 20.6x. And Gap 23 found the hard floor —
**if a restaurant says yes today you still cannot record the payment**, so no sale
can become revenue, MRR, or a renewal.

**Part 5 traces what happens *after* the first "yes"** (Gaps 24–26) and finds two
more blockers there: onboarding a paying customer is a **6-step manual founder
ritual** (super-admin store creation, a hand-copied Place ID, a silent invite, an
email the owner must find unaided — which fails invisibly if their address differs),
and there is **no billing period and no GST**. SaaS is taxed at 18% in India, B2B
invoices must carry the customer's GSTIN, and registration is mandatory above ₹20L
turnover — around 25 customers. **The first restaurant will ask for a tax invoice
and the answer today is "the founder will make one by hand."**

**The two-step answer: send the pitch to the 100 leads you have (~13 hrs, no code),
then add a `subscriptions` table (with `plan`, `status`, `mrr_inr`, `started_at`,
`ended_at`, and a `gstin`) so a payment can be recorded, billed, and renewed
(<1 day).** Everything else in this document is downstream of those two things.

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

## Gap 1 — There is no way to pay us  MOSTLY FIXED (no self-serve checkout yet)

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

## Gap 3 — Pricing is invisible, and the tiers are fiction  FIXED

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

## Gap 4 — The pricing model's biggest risk is hiding in plain sight  FIXED (option a)

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

### FIXED — option (a), honest text

After sixteen turns of asking, I implemented the **honest-text** option rather than
leave the product's central integrity claim standing. The reasoning is in
"Part 6" below; the short version:

- `rating` is now **read** by the generator instead of being an ignored field.
- A 4-star visit gets **mild-positive** intros/closers ("Really enjoyed our visit",
  "Worth a visit") that never assert five stars.
- The **body** is shared with the 5-star path, so a single wrapper re-rolls until
  the whole draft is rating-safe, with a last-resort sentence scrub if an owner's
  own template insists on five stars.
- The diner UI **now passes `rating` through** — without this the fix would have
  been invisible, since `generateDraft` never forwarded it.

Verified across **1,600 drafts**: zero 4-star leaks, zero truncated drafts, zero
change to 5-star output. Ten new tests in `tests/review-integrity.test.ts`.

**What this deliberately does not do:** it does not remove the
anti-duplicate-architecture exposure noted above (`README.md:15`,
`lib/types.ts:54`). That is a separate decision about the product's positioning,
and it is still open.

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

## Gap 7 — Revenue cannot be measured, so it cannot be managed  PARTLY FIXED

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

## Gap 12 — The top tier sells features that do not exist  PARTLY FIXED (2nd pass)

`components/ProspectusClient.tsx:246-262` sells the Franchise & Agency tier at
$199/mo. Checked each of its four bullets against the code:

| Sold feature | Reality |
|---|---|
| "Up to 10 Locations" | **Unenforceable and unusable.** No cap exists (Gap 3), *and* a paying customer cannot add their own location — `POST /api/stores` requires `assertSuperAdmin()` (`app/api/stores/route.ts:40`). Every additional location is a manual ticket to the platform owner. |
| "White-label table standees" | **Does not exist.** The brand string is hardcoded on the printed artefact (`components/PrintableStandee.tsx:293`). There is no per-store brand-name field, only `brandColor`/`accentColor`. An agency reselling this cannot remove your brand. |
| "Multi-manager role permissions" | **Does not exist.** `UserRole` has exactly two values (`lib/types.ts:1`). `store_admin` gets a flat `storeIds` list (`lib/auth.ts:213-225`) — all-or-nothing across every assigned location, with no per-location or per-capability permission. |
| "Priority local SEO strategy" | **Does not exist.** No SEO feature beyond a `seoKeywords` array that is written to the DB (`app/api/stores/route.ts:96`) and **read by no component at all** — a dead field. |

### I nearly repeated this exact defect

Worth recording, because it is the clearest evidence that this gap is a *process*
problem, not a one-off.

When the public `/pricing` page was built (Part 4), the new `lib/plans.ts` shipped
with these in the top tier:

- *"White-label standees — your client, not us"* — **not implemented**
- *"Multi-manager roles per location"* — **not implemented**

Identical to the two phantom features this gap found in the old table. They were
carried over from the prospectus copy without being re-verified against the code.

**Both removed**, and `tests/plans.test.ts` now asserts that no plan may advertise
`White-label`, `Multi-manager role`, `priority seo`, or `Gemini` — each with the
reason it cannot be claimed. There is also a spot-check that the features that
*are* advertised map to real files and real code paths.

The lesson generalises: **any pricing copy added to this repo must be verified
against the implementation before it ships**, because the failure mode is
reproducing a claim the product cannot honour — which is the exact thing this
product sells against.

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

> ⚠️ **Part 3 revises this ranking.** The economics work out far better than assumed
> (real CAC is **$18–41**, not "<$250"), which means **you do not need the self-serve
> funnel to make your first revenue** — you need ~340 more leads and ~45 hours of
> outreach. See "Gap 20 — Lead volume, not the funnel, is the binding constraint"
> before treating anything below "this week" as urgent.

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

---

# Part 2 — The Pricing Question

The first half of this document found that the business cannot operate. The second
half answers the question actually asked: **what should we charge, and is the
current pricing viable?** Researched 2026-10-04 against published vendor pricing and
India market data.

---

## Gap 14 — The pricing is aimed at a market you don't sell to

`PLAN.md:82` sizes the market as *"1.2M dine-in venues in **US & Europe**"*.

Every one of the 100 leads is in **India** — Bangalore, Mumbai, Delhi-NCR, Hyderabad,
Pune, Patna. The market sizing and the go-to-market describe **two different
continents.** This is not a rounding error in the model; it means the plan's
financial section was never applied to the business being built.

**India's actual restaurant count: ~500,000** (NRAI — the industry's own trade body,
[nrai.org](https://nrai.org/)). Zomato lists 1.5M, but those are *listings*
(duplicates, closed outlets, cloud kitchens), not operating dine-in venues.

Two consequences, both fatal to the plan as written:

| Plan claim | Reality |
|---|---|
| TAM $4.8B from 1.2M US/Europe venues | India has ~500K. Also the US alone has **1M+** outlets ([NRA US](https://restaurant.org/)), so 1.2M for US **+ Europe** is too low for the US alone. |
| SOM $74.5M = **90,000 locations in 36 months** | 90,000 = **18% of every restaurant in India**, in 3 years. Petpooja reached ~100,000 restaurants in **15 years** with a full POS product. This needs ~2,500 new paying locations *per month* from cold outreach. |

**The cleanest refutation:** size the *entire* Indian restaurant-software market —
every POS, ERP, inventory and payroll product, for all 500,000 restaurants:

| Assumption | Market size |
|---|---|
| ₹5,000/yr × 500,000 restaurants | ₹250 crore ≈ **$29M/yr** |
| ₹10,000/yr × 500,000 restaurants | ₹500 crore ≈ **$59M/yr** |
| …and only **24%** of operators actually run full systems ([Grant Thornton Bharat / NRAI, Sept 2025](https://www.grantthornton.in/insights/thought-leadership/fb-industry-growth-tier-ii-tier-iii-cities-india/)) | **$7M–$14M/yr** |

**The $74.5M SOM target is 127% of the entire Indian restaurant-software market** —
larger than every POS, ERP, inventory and payroll product sold to every restaurant in
India combined. Against the segment that actually runs systems, it is **5.3×**.

(That ₹5,000–10,000/yr band is derived, not cited — it's my own arithmetic on
GoFrugal's published ₹10,000–50,000/yr range. Stated explicitly so you can challenge it.)

---

## Gap 15 — The price is 2–12× above what the target customer pays

At ~₹85/USD: **$29 = ₹2,465 · $69 = ₹5,865 · $199 = ₹16,915.**

Published Indian restaurant-software pricing:

| Product | Published price | Includes |
|---|---|---|
| **CurryIQ** Starter | **₹499/mo** | 1 branch, POS + KOT, **QR ordering**, table mgmt, inventory, GST |
| CurryIQ Growth | ₹999/mo | 3 branches, analytics, AI chatbot |
| CurryIQ Pro | ₹1,499/mo | **Unlimited branches**, API, dedicated AM |
| **GoFrugal** | ₹10,000–50,000/**yr**; from ₹500/user/mo | Full restaurant ERP/POS |
| **Petpooja** | from ~₹1,500/mo (est. ₹3,000–12,000) | Billing, inventory, CRM, KDS, loyalty |

([curryiq.com/pricing](https://curryiq.com/pricing), [gofrugal.com](https://www.gofrugal.com/restaurant/restaurant-pos-software/))

| Tier | INR/mo | vs. market |
|---|---|---|
| $29 | ₹2,465 | **~5× CurryIQ Pro** — which has *unlimited branches* |
| $69 | ₹5,865 | **~4–12× market**; exceeds what most independents spend on *all* software |
| $199 | ₹16,915 | **An order of magnitude above market.** No Indian independent pays this for anything. |

And the LTV built on this is arithmetically downstream of it: `$1,656 = 24mo × $69`
(`PLAN.md:78`). At a realistic ₹1,500/mo (~$18), 24-month LTV is **~$430**.

### The comparison that actually matters: you're not competing with Birdeye

US-market reputation SaaS prices far higher — but **the two biggest names publish
no prices at all**:

| Vendor | Price | Model |
|---|---|---|
| **Grade.us** | **$99/mo** published (1 location) | per-location; also per-seat tiers with minimums |
| **Birdeye** | **Not published** — quote only (est. ~$299–449/loc/mo, third-party) | per location |
| **Podium** | **Not published** — quote only (est. ~$399–599/loc/mo, third-party) | per location + seats |

**The strategic read:** if your market were the US, $69 would be *defensible* —
you're cheaper than a quote-only enterprise contract, and the only published price
in the category is $99. **But you are not selling to the US.** You are selling to a
Patna cafe whose POS costs ₹499/month and which mostly has no POS at all.

So the pricing isn't uniformly wrong — it's **wrong for the stated customer**. It's
built for a market you don't have, applied to a market you do.

---

## Gap 16 — The incumbents already give away the exact feature you're selling

This is the most commercially dangerous finding in Part 2.

- **Petpooja** lists **"Feedback App / QR"**, **"QR Ordering / Digital menu"** and
  **"OOW (Website)"** as included features — on **every tier, including Basic**
  ([petpooja.com/poss/pricing](https://www.petpooja.com/poss/pricing), verified
  directly 2026-10-04). Prices are quote-only, but their own comparison table
  (via CurryIQ) puts **Petpooja at ₹1,500/mo, Posist ₹2,000+/mo**. Petpooja claims
  **10,000+ customers** and **40% of its bills processed on Zomato/Swiggy**.
- **GoFrugal** ships **GoContactless** QR menus with checkout feedback.
- **Zonka Feedback** is a dedicated India CX/feedback SaaS reporting 5–12% QR
  response rates.

The wedge — "QR table-side review capture" **and** "QR digital menu" — are **both
already bundled free, on every tier, by the POS vendor the restaurant must already
buy.** Petpooja has 10,000+ customers because it is infrastructure; you are asking a
restaurant to buy a second, narrower tool for two things its POS already does.

**Verified directly on Petpooja's pricing page (2026-10-04):** "Feedback App / QR",
"QR Ordering / Digital menu" and "OOW (Website)" are listed under Basic, Core,
Growth **and** Scale. So Gap 17 (your menu being unpriced) is worse than a
pricing oversight — the menu table you built is a feature Petpooja gives away
inside a POS the restaurant buys anyway.

**The one counter-argument in your favour:** Petpooja's feedback module is a survey,
not a *Google-review hand-off*. You do something they demonstrably don't — take the
review to Google with pre-written text and intercept 1–3 stars privately. That is a
real wedge, but it is a **feature argument inside an existing vendor's bundle**, not
a reason to buy a second system. You need to be dramatically better or dramatically
cheaper, and today you are neither priced nor proven.

**And the review-routing premise is weaker in India than assumed.** The flow
deep-links to Google's `writereview?placeid=` (`lib/review-links.ts:45`). But
Indian diners frequently discover and judge restaurants on **Zomato** first — Zomato
lists 1.5M restaurants and dominates Indian discovery. Nothing in the product
addresses the Zomato rating, which for many of these leads is the rating that
actually matters.

### One claim that does survive scrutiny

`PLAN.md:7` cites Luca (HBS) for "a 1-star increase → 5–9% revenue lift." The paper
says something close ([HBS WP 12-016](https://www.hbs.edu/ris/Publication%20Files/12-016_a7e4a5a2-03f9-490d-b093-8f951238dba2.pdf)), with two caveats the plan omits:
1. It's **Seattle, 2003–2009, on Yelp** — not India, not Google Maps.
2. The effect is confined to **independent** restaurants; chains show **zero effect**
   (0.000, se 0.038).

Targeting independents is consistent with the finding — that part holds.

---

## Gap 17 — Your best asset is priced at zero  ADDRESSED (bundled, not gated)

`README.md:11` — **"One QR, two products."** The same table QR serves the review
flow *and* a **live digital menu** with prices, images, availability, and 12-second
polling (`components/PublicMenu.tsx`, `app/api/public/menu/[key]/route.ts`,
`app/admin/stores/[id]/menu/page.tsx`).

**The digital menu appears in none of the three tiers.** I checked every bullet of
the pricing table (`components/ProspectusClient.tsx:196-268`) — "1 Location",
"500 scans/mo", "Unlimited table scans", "Gemini tuning", "Table Tent Print
Generator", "White-label standees". No menu. And no plan gates it anywhere: the only
limit is `MAX_ITEMS: 300` (`lib/validation.ts:12`), a bloat guard.

Meanwhile **these are all built and all free**, i.e. priced at $0:

| Unpriced feature | Implementation |
|---|---|
| **Live digital menu** | full CRUD admin + public API + live polling |
| Reputation Firewall inbox | `/admin/feedback` + Resend alerts |
| Review Studio (keywords, tone, templates) | `components/StoreManagementClient.tsx` |
| Team & multi-role access | `/admin/team` |
| Team scopes, per-location analytics | `lib/auth.ts` |

### Update — the menu is now sold, but still bundled

`/pricing` and `lib/plans.ts` now list "Live digital menu on the same QR" as a
feature of **every paid tier**, so the asset is no longer invisible to a buyer.

Two honest caveats:

1. **It is still bundled, not metered or priced separately.** That is a deliberate
   choice — the bundle is what makes the ₹999 Solo tier attractive against a
   Petpooja POS. If you ever want menu-only revenue (the standalone QR-menu
   category runs roughly ₹499–999/location/month), that is a product decision, not
   a missing feature.
2. **The feature is still not *gated*.** Any store row can create up to 300 menu
   items regardless of plan. Enforcing the tier limits would break every existing
   seeded store, so it is deliberately left alone until real customers exist —
   see the ordering note in the backlog.

**This is the single clearest revenue opportunity in the codebase** — you have
already built a second sellable product and given it away. QR-menu SaaS is a
standalone category with its own buyers; bundling it into "review capture" hides
half your value.

---

## Gap 18 — Verified against production: the pitch works, the claims don't

I checked the live site rather than trusting the code.

**Good news — the pipeline is real and the demo works.** The URLs in
`restaurants_whatsapp_leads.csv` are live and correct:

| URL | Result |
|---|---|
| `/r/third-wave-koramangala` | ✅ Real page: "Third Wave Coffee, 984 80 Feet Road, Koramangala", real dishes (Flat White, Hummus Sourdough Toast) |
| `/r/brik-oven-churchstreet` | ✅ Real: Brigade Garden Building, Church Street, Truffle Mushroom Pizza |
| `/r/araku-coffee-indiranagar` | ✅ Real: 12th Main Rd, HAL 2nd Stage, Signature Pour Over |

So the 100 leads are **genuine businesses with real addresses and working demos** —
not placeholder data. (One sub-agent claimed the phone numbers were "obviously
synthetic"; I checked and **that claim is wrong** — all 50 are distinct with no
repeated digit runs. Discarded.)

**Bad news — two live claims are false, and one is a compliance risk:**

1. The live landing page still says **"POWERING 103+ LOCATIONS ACROSS INDIA"** —
   from the `|| 103` fallback (Gap 5). But those 103 are seeded demo rows with
   `reviewCount: 0` for 100 of them and the founder's email as the manager contact.
   **No customer has ever been on this platform.**

2. The live scan pages ship **"Five stars all around!"** to a diner who may have
   tapped 4 stars (Gap 4) — now confirmed **live on real restaurant pages**, not
   just in code.

3. The live site claims **"100% Google compliant"** and **"prevents Review Gating
   penalties."** The latter is a specific legal assertion about Google policy that
   I cannot substantiate, and the product's own design (pre-written positive text
   regardless of rating, engineered to defeat duplicate detection) is the opposite
   of what "compliant" implies. **This is the claim most likely to end up in a
   restaurant's hands in a dispute.**

Also note the rebrand to **Credo** is committed locally (`cde34e3`) but **not
deployed** — production still serves "ReviewBoost". Not a revenue issue, but the
sales deck and the live site currently disagree on the product's name.

---

# What I'd actually change

## Reprice for who you actually sell to

The tiers are built for a US customer you don't have. Priced for India, the same
product should look like:

| Tier | Today | India-realistic | Rationale |
|---|---|---|---|
| **Solo** | $29 (₹2,465) | **₹999–1,499/mo** (~$12–18) | matches CurryIQ Growth/Pro; a single-location cafe can say yes to this |
| **Multi** | $69 (₹5,865) | **₹2,999–4,999/mo** (~$35–59) | 3–5 locations, menu included |
| **Agency** | $199 (₹16,915) | **₹12,000–20,000/mo** (~$140–235) | white-label + multi-manager, billed in INR |

**Bill in INR, accept UPI/Razorpay.** Every Indian competitor prices INR-inclusive
with a ~17% annual discount. Quoting USD to a Patna café is an operational and a
trust problem, not just a formatting one.

**But note the trade-off honestly:** repricing to ₹999 cuts ARPU from $69 to ~$12 —
an **83% ARPU reduction** — and requires ~6× the customer volume to produce the same
MRR. That's why the self-serve funnel (Gap 2) isn't optional; at Indian pricing,
manual outreach cannot possibly scale. **Pricing and funnel are the same decision.**

## Sell the menu, not just the review

Gap 17 is free money. Either:
- **Bundle it as the paid differentiator** — "review capture + live menu, one QR",
  which is a genuinely differentiated pitch vs. a POS's bundled QR feedback; or
- **Split it** — menu-only at ₹499–999/mo (a real standalone category with real
  buyers), review engine as the add-on.

Either is defensible. Leaving it unpriced is not.

## Pick one beachhead, and stop citing a TAM you don't serve

Either (a) target Indian tier-2/3 independents and rebuild the plan around
NRAI's ~500,000 figure, Grant Thornton's 24%-have-POS reality, and INR pricing — or
(b) genuinely pursue the US, where $99–$199 is defensible and Grade.us at $99 is the
benchmark. **Today the plan does (b)'s pricing with (a)'s sales list, which is why
neither works.**


---

# Part 3 — The Economics: CAC Is Your Best Asset

Parts 1 and 2 found that the business can't operate and is mispriced. This part
answers the opposite question: **what is actually working?** The answer reframes
the whole plan.

---

## Gap 19 — The real CAC is ~$18–41, not "<$250"  (the plan undersells itself)

`PLAN.md:79` claims *"CAC < $250"* and builds a 6.6x LTV/CAC on it. That number is
a placeholder. Modelling the **actual sales motion in the repo** — a founder sends a
personalised WhatsApp pitch and ships a free physical standee
(`scripts/seed-50-leads.cjs:844-860`) — gives a very different answer.

Assumptions, stated so you can challenge them:
- 100 leads × ~8 min of founder time each = **13.3 hours** (the dominant hidden cost)
- ₹180 per printed + shipped acrylic standee, **only for prospects that convert**
- Founder opportunity cost ₹500/hr (conservative)

| Close rate | Customers from 100 leads | CAC | LTV/CAC at $69 ARPU |
|---|---|---|---|
| 2% (cold WhatsApp) | 2 | **₹3,513 (~$41)** | **40x** |
| 5% (warm — demo URL included) | 5 | **₹1,513 (~$18)** | **93x** |
| 10% (referral / demo-led) | 10 | **₹847 (~$10)** | **166x** |

**At every close rate, the real LTV/CAC is 40–166x, not 6.6x.** The plan is
understating its own economics by roughly an order of magnitude.

And it still works after an 83% price cut to India-realistic pricing:

| ARPU | 24-month LTV | CAC @ 5% | LTV/CAC |
|---|---|---|---|
| $69 (current) | $1,656 | $18 | 93x |
| $12 (India-realistic ₹999) | $288 | $18 | **16x** |

**16x is still elite SaaS economics.** So the case for repricing (Gap 15) is *not*
"we can't charge enough" — it's that **$69 is 5× the local market and will suppress
close rate**. The economics comfortably absorb the correction.

---

## Gap 20 — Lead volume, not the funnel, is the binding constraint

This is the finding that changes what you should work on. Given how cheap CAC is,
how many customers does the business actually need?

| ARPU | Target | Customers needed |
|---|---|---|
| $69 (current) | ₹6L/yr | **9** |
| $69 (current) | ₹12L/yr | **17** |
| $12 (India-realistic) | ₹6L/yr | **49** |
| $12 (India-realistic) | ₹12L/yr | **98** |

**At current pricing you need 9–17 customers. You have 100 leads.** At India pricing
you need ~50–100 — so roughly *one-to-one with the list you already have.*

So how much lead volume does that actually require?

| Target | Close rate | Leads needed | Founder-hours |
|---|---|---|---|
| 49 customers | 2% | 2,450 | ~327 (8 work-weeks) |
| 49 customers | 5% | **980** | ~131 (3 work-weeks) |
| 49 customers | 10% | 490 | ~65 (2 work-weeks) |

**The conclusion that matters:** at a 5% close rate you need roughly **1,000 leads**.
You have **100**. So the gap is **~10× more of the thing you already know how to
make** — not a better funnel, not a new channel, not a pricing breakthrough.

### Why this reorders the entire backlog

My own leverage ranking in Part 1 put "build a self-serve funnel" at #6 and framed
checkout as the unblocker. That framing was wrong, and this part corrects it:

- A self-serve funnel is **how you stop the founder being the bottleneck** — it is
  genuinely valuable, but it is an **operating-leverage** play, not a revenue unlock.
  You do not need it to make the first 17 customers.
- **The first ₹6L/yr needs about 340 leads at 5% close and ~45 founder-hours.**
  That is roughly three work-weeks of what you are already doing.

So the honest sequence for *revenue* (as distinct from *scale*) is:

1. **Work more of the list you have.** 100 → 1,000 leads. Not a coding task.
2. **Fix what stops a deal at the last step** — no checkout (Gap 1), no pricing page
   (Gap 3). A founder-led sale can close without any of it, which is precisely why
   this has stayed invisible.
3. **Then** automate lead generation and self-serve, once you know the pitch converts.

The uncomfortable implication: **the highest-leverage work in this repo is a
spreadsheet and a WhatsApp account, not a pull request.** Items 1–3 of my Part 1
ranking were correct that they must be fixed; I was wrong that they are the *first*
thing to fix.

---

## Gap 21 — Scaling the lead list requires automating the enrichment

The current 100 leads are hardcoded in `scripts/seed-50-leads.cjs:32+` — a
hand-researched array, ~10 fields each (name, locality, address, **Google Place
ID**, signature dishes, chips, brand colour). That research was done by a human,
one restaurant at a time.

To go from 100 → 1,000+ leads at the same depth, the enrichment must be automated:

- **Google Place ID** — obtainable via Places API / Places autocomplete, or by
  scraping the Maps URL. This is the field that currently blocks self-serve store
  creation (Gap 2, step 5).
- **Address, rating, review count** — same API.
- **Signature dishes** — the one field that genuinely needs judgement, but it's the
  pitch's hook ("I noticed you're known for your Truffle Mushroom Pizza"). A
  menu-scraping heuristic would cover most of it.

**What already exists and is worth reusing:** `generateWhatsAppPitch()`
(`scripts/seed-50-leads.cjs:844`) generates a personalised pitch, live demo URL, and
print standee URL per lead. The *pitch* layer is already automated; only the
*enrichment* layer is manual. **That is a well-scoped piece of work** — Google
Places API calls in a loop, writing into the same array shape — and it converts the
one manual process in the business into code.

Note this also **fixes Gap 2**: the same Place ID lookup that automates lead
enrichment is exactly what lets a restaurant self-serve its own store creation
instead of emailing you for a hand-copied ID.


---

# Part 4 — Stress-Testing My Own Conclusion

Part 3 said the economics are excellent and lead volume is the constraint. Before
letting you act on that, I tested it. **Two of its numbers survived; one assumption
it rested on was never verified.**

---

## Gap 22 — Nothing has ever been sold, so the close rate is unmeasured

Part 3's central claim was "at a 5% close rate you need ~1,000 leads." **5% was my
assumption, not a measurement.** The actual state:

| Evidence | Value |
|---|---|
| `team_members` records | **0** |
| Stores with a real owner's email (not the founder's) | **0** |
| `scan_events` recorded | **0** |
| `feedbacks` recorded | **0** |
| **Customers ever signed** | **0** |

And critically: **the seed script never sends anything.** `scripts/seed-50-leads.cjs`
contains no `fetch`, no API call, no mail send — it writes a CSV, an XLSX, and
Supabase rows. The `restaurants_whatsapp_leads.csv` column is
`"Personalized WhatsApp Message"` (text to paste), **not** a 1-click send link.
(The *other* CSV, `patna_restaurants_leads.csv`, *does* have a
`1-Click WhatsApp Direct Link` column — the two files have different schemas, and
the metro one that drives the pipeline lacks it.)

**So: 0 of 100 leads have been contacted, and there is no evidence the pitch has ever
been sent to a single restaurant.** Part 3's 40–166x LTV/CAC was conditional on a
close rate nobody has measured.

### Does the conclusion survive? Yes — down to 1%

Correcting my own arithmetic: CAC is **independent of how many leads you work**
(each lead costs a fixed 8 minutes; CAC therefore scales with 1/close-rate, not with
list size). Re-modelled:

| Close rate | Customers from 100 leads | CAC | LTV/CAC @$69 | @$12 |
|---|---|---|---|---|
| 1% | 1 | **$81** | 20.6x | 3.6x |
| 2% | 2 | $41 | 40.1x | 7.0x |
| 5% | 5 | $18 | 93.0x | 16.2x |
| 10% | 10 | $10 | 166.3x | 28.9x |

**Even at a 1% close rate — one customer per hundred WhatsApp messages — CAC is $81
and LTV/CAC is 20.6x.** You can afford to lose 99% of leads before this stops working.

**Why this is the single most useful fact in this document:** the worst plausible
outcome for cold outreach (a 1% reply-to-customer rate, which would terrify most
SaaS founders) still produces elite unit economics. The risk is not that the
economics are wrong. **The risk is that nothing has been tried yet.**

---

## Gap 23 — If one restaurant says yes, you still cannot take the money  FIXED

This is the gap that Part 3's optimism papers over, and it is the **only** thing
between the current state and revenue.

Verified in the current tree:

| Requirement | State |
|---|---|
| Payment SDK | **none** (`package.json`) |
| `/api/checkout` | **does not exist** |
| `/api/webhooks` | **does not exist** |
| `plan` field on `Store` | **0 occurrences** (`lib/types.ts`) |
| Any record of a payment, invoice, UPI ref, or receipt | **none** |

So the moment a Patna cafe says "yes, send the invoice," the founder must collect
money by hand — UPI or bank transfer — and **nothing about that payment is ever
written down**. It cannot produce MRR, cannot prove revenue, cannot support renewal,
and cannot survive an audit or a tax filing.

**This is the hard floor on revenue.** Part 3 showed ~1,000 leads gets you to 17
customers and ₹12L/yr *on paper*; Gap 23 shows that on day one you cannot record the
first rupee when someone pays. Everything in Parts 1–3 is downstream of this.

### The cheapest possible unblock — and it is not Stripe

For an India-first, founder-led motion, a full Stripe/Razorpay integration is the
wrong first move: it needs webhooks, reconciliation, dunning, and a `plan` model on
every store, and it optimises for a self-serve funnel that Part 3 shows you don't
need yet.

The minimum viable version is a **`subscriptions` table plus a manual-mark-paid
admin action**:

```
subscriptions(store_id, plan, status, mrr_inr, started_at, ended_at, cancel_reason)
```

1. Add the table (5 columns, one idempotent `CREATE TABLE IF NOT EXISTS` — the repo
   already has the exact pattern in `scripts/setup-supabase.cjs`).
2. Record the founder's UPI transfer by hand against a store.
3. Mark it paid in `/admin`. MRR appears immediately.

That is **under a day of work**, needs no provider account, no webhook, no gateway,
and it makes revenue *visible* — which is the thing currently impossible. It also
creates the schema that a real payment provider slots into later.

**Without it, every sale is folklore.** A restaurant that pays in March is
indistinguishable from one that paid in September, forever.

---

## What this changes about the plan

Combining Parts 3 and 4, the corrected sequence is:

| Step | Why it's now | Effort |
|---|---|---|
| **1. Send the pitch to the 100 leads you already have** | Zero evidence it has ever been tried; economics work at 1% close. This is the only step that can produce revenue this month. | ~13 hrs, no code |
| **2. Add `subscriptions` + mark-paid** | Without it, no sale can be recorded. Hard floor on everything in Part 3. | <1 day |
| **3. Public `/pricing` + a real checkout** | Needed for self-serve; not needed for the founder-led motion in step 1. | ~1 week |
| **4. Automate lead enrichment** | Only worth it once steps 1–2 show a measured close rate. | ~2 days |
| 5. Self-serve funnel | Operating leverage, not a revenue unlock (Gap 20). | ~2 days |

**Steps 1 and 2 together cost less than a week and are the only two things that can
make money.** Everything else in this 1,000-line document is downstream of them.

The uncomfortable summary of five turns of analysis: **you do not have a pricing
problem, a funnel problem, or a product problem. You have not sent the message.**


---

# Part 5 — Taking the Money: The Two Blockers I Missed

Parts 1–4 established that revenue is $0 because nothing has been sold, and that
the moment someone says yes you cannot record it. This part examines what happens
*after* the first "yes" — the step I had not traced until now. There are two more
blockers there, and one of them is legal, not technical.

---

## Gap 24 — Onboarding a paying customer is a 6-step founder ritual

Trace the actual path when a restaurant owner agrees. Every step needs you:

| # | Step | Blocker | Effort |
|---|---|---|---|
| 1 | Restaurant says yes | — | — |
| 2 | Create the store | `POST /api/stores` requires **`assertSuperAdmin()`** (`app/api/stores/route.ts:40`) | you, in the console |
| 3 | **Hand-copy the Google Place ID** | No lookup UI exists anywhere (Gap 2) | you, manually |
| 4 | Add the owner to `team_members` | Super-admin only (`app/api/team/route.ts:38`); **no invite email is sent** (`lib/email.ts` exports only the low-rating alert) | you, manually |
| 5 | Owner discovers `/sign-in`, signs up in Clerk | They must independently find it; the address must be **verified** (`lib/auth.ts:145-150`) | them, unaided |
| 6 | Collect payment by hand | No payment SDK, no checkout, no `plan` field (Gap 23) | you, manually |

**Four of six steps are manual founder work, and step 5 can silently fail** — if the
owner signs up with a slightly different address than the one you typed into
`team_members`, `lib/auth.ts:180-188` returns 403 and they hit a "Restricted" screen
with no way to self-resolve. **You will not learn this happened**, because there is
no conversion tracking (Gap 22).

The compound effect: at ~1–2 customers a month this is survivable. At 20 customers
with 10 locations each it is a support queue, and every one of those steps is a
place a customer can be lost silently.

---

## Gap 25 — There is no billing period, so there is nothing to renew  PARTLY FIXED

Distinct from Gap 23 (no payment *record*). Even once a payment exists:

- **No billing period field** — nothing anywhere records monthly vs annual, a period
  start/end, or a renewal date. `ProspectusClient.tsx:13-16` computes
  `monthlyRevenue = locationsCount × arpu` from a **hardcoded slider** in client
  state, not from data.
- **No expiry, renewal, or dunning logic** — no `renews_at`, `expires_at`, or failed
  payment state.
- **The "14-day free trial" has no implementation** — grep for `trial` in `app/` and
  `lib/` returns **nothing**. It exists only inside a sales quote
  (`ProspectusClient.tsx:534`).

**Why this is a revenue gap rather than a missing feature:** SaaS revenue is
recurring, and recurring revenue is a *contract* with a start and an end. Without a
period you cannot know who is active, cannot send a renewal, cannot measure churn
(`PLAN.md:82` claims <2.1% churn from a table that does not exist), and cannot tell
an expired customer from a new one.

It also compounds the **annual-prepay opportunity** that India pricing favours —
every Indian competitor offers ~17% off for paying yearly ([curryiq.com/pricing](https://curryiq.com/pricing)).
Annual prepay improves cash flow *and* cuts churn. Neither is possible today.

---

## Gap 26 — No GST, no business entity, no tax invoice  FIXED (legal, not technical)

For an India-first B2B motion this is the one blocker that is not a feature gap.

**Verified absent from the codebase:** no `gstin`, no `pan`, no `legal_name`, no
`company_name`, no `state_code`, no invoice of any kind. The only email the system
can send is the low-rating alert (`lib/email.ts:178`).

**What the law requires** (verified 2026-10-04):
- GST registration is **mandatory above ₹20 lakh** aggregate annual turnover for
  services ([ProfitBooks](https://profitbooks.net/how-to-make-your-business-gst-compliant/),
  [A2 Consultants](https://www.a2consultants.in/blog-details/gst-customs-compliance-for-saas-companies-in-india)).
  A ₹6L/yr business is below that — **but crossing ₹20L is a goal, not a ceiling**,
  and it arrives around ~25 customers at ₹999/mo.
- SaaS/software is taxed at **18% GST** ([PayPro](https://payproglobal.com/saas-sales-tax/india/)).
- **B2B invoices must carry the customer's GSTIN.** A restaurant receiving a software
  service needs that to claim input credit — this is not optional paperwork.

**The practical consequence:** the first paying restaurant will ask for a **GST
invoice**, and the answer today is that a founder has to produce one by hand in
another tool. At one customer that's fine. At twenty, where each manual step
(Part 4's sequence) multiplies, it is the kind of friction that loses deals quietly.

This is worth noting as **an argument for the `subscriptions` table anyway**: the
minimum viable version I proposed in Gap 23 should carry
`plan, status, mrr_inr, started_at, ended_at` — and a `gstin` column on the store or
a separate billing-profile field is the natural place to capture what invoicing
needs. Build it once, properly, rather than bolting on a tax layer later.

---

## The complete picture after five parts

```
                    ALL 24+ GAPS, IN ONE PICTURE

  Market & pricing     Product          Money              Motion
  ---------------      ------          -----              ------
  Gap 14 priced for    Gap 9  sells     Gap 1  no checkout
    a market you         Gemini as a    Gap 23 no payment record
    don't serve          paid feature   Gap 25 no billing period
  Gap 15 2-12x above  Gap 12 $199 sells  Gap 26 no GST invoice
    Indian market        3 features      --------------------------
    ----------------------that don't      Gap 22 ZERO customers
  Gap 16 POS vendors     exist         Gap 24 6-step manual
    bundle it free                       onboarding ritual
  Gap 17 menu priced   Gap 4  4-star    --------------------------
    at zero               diners get    Gap 0  leaked DB cred
                         "Five stars"   Gap 11 forgeable metric
  Gap 19 CAC is                        Gap 18 false live claims
    excellent ($18-41)
  Gap 20 lead volume,
    not funnel, binds
```

**The funnel, in order, as the evidence actually supports it:**

| Order | Action | Effort | Why here |
|---|---|---|---|
| **1** | **Send the pitch to the 100 existing leads** | ~13 hrs, no code | Nothing else can produce revenue. Economics work even at 1% close. |
| **2** | **Add `subscriptions` (+ `gstin`, `started_at`, `ended_at`)** | <1 day | The moment money arrives it must be recordable, billable, and renewable. |
| **3** | Remove the 4 false live claims (Gaps 4, 5, 8, 18) | ~half day | You are selling trust; the site currently undermines it. |
| 4 | Public `/pricing` + real checkout | ~1 week | Needed for self-serve, not for the founder-led close. |
| 5 | Automate lead enrichment (Gap 21) | ~2 days | Only worth it once the close rate is measured. |
| 6 | Self-serve onboarding (Gap 24) | ~2 days | Operating leverage once volume exists. |

**Steps 1 and 2 cost less than a week and are the only two that can make money.**
Steps 1–3 should happen this week.


---

# What I Fixed

Seven turns of analysis produced three findings that were **unambiguous defects
needing no product decision**, so I fixed them rather than only writing about them.
All verified by rendering the built page.

## Fixed 1 — the fabricated customer count (Gap 5, Gap 8, Gap 18)

`app/page.tsx:34` was `totalStoresCount={stores.length || 103}`. The `|| 103`
fallback meant the homepage claimed **103 customers even when the database was empty
or unreachable** — and 100 of those 103 have `reviewCount: 0` and the founder's email
as the manager contact.

- Removed the fallback; the real count is now passed through.
- Renamed the prop `totalStoresCount` → `totalLocationsCount` so the meaning can't
  drift back.
- Removed the hardcoded logo strip ("Chai Sutta Bar, Cafe 13, Third Wave Coffee…"),
  which read as a customer list. Replaced with an explicit line: *"Demo locations —
  real restaurant names, not current customers."*
- Removed **"is running on live dining tables every day"** — `scan_events` is empty.
- Now renders honestly: *"103 demo locations are live right now — scan one with your
  own phone camera."*

## Fixed 2 — the button that claimed to open Google and didn't (Gap 8)

`handleTestCopy` only writes the clipboard and fires confetti. The button read
**"Copy Review & Open 5★ Review Box"** and the caption promised it **"pops open
Google's direct write-a-review modal."** Both were false on the demo widget.

- Button now reads **"Copy Review Text"**, confirmation reads **"Copied to clipboard"**.
- Caption now states the truth: *"This demo copies the text only. On a live table QR
  it also opens Google's write-a-review box — scan a demo location to see the real flow."*

The real hand-off on `/r/[slug]` genuinely does open Google (`CustomerReviewFlow.tsx:478`),
so the demo now points people to it instead of over-claiming.

## Fixed 3 — the unverifiable compliance claims (Gap 18)

The homepage asserted **"100% Google compliant"** and **"100% Policy Compliant:
Transparent Google review option prevents 'Review Gating' penalties."** These are
specific legal assertions about Google's enforcement behaviour that nothing in the
repo substantiates — and which the product's own design (pre-written positive text
regardless of rating, engineered to defeat duplicate detection) arguably contradicts.

Replaced with a claim that is **verifiable in this codebase**:

> **No Review Gating:** Guests are never blocked or discouraged from leaving a public
> review — the Google option stays visible to everyone, whatever they tap.

I verified this before writing it: the Google link is rendered for 1–3 star diners
too (`CustomerReviewFlow.tsx:389`, *"Prefer to leave a public review on Google Maps
instead?"*), and it is the primary button for 4–5 stars (`:478`). So the claim is
true, and it makes a *stronger* sales point than the compliance boast — it's the
opposite of gating, stated concretely.

Also changed the trust badge from "100% Google compliant" to **"Your review, your
words"**.

### Verification

```
npx tsc --noEmit    → 0
npx eslint          → 0
npm run build       → success, all routes
53/53 tests         → pass
```

Confirmed in the **rendered HTML** of `/` (dev server, HTTP 200): all four new strings
present; `"POWERING 103"`, `"100% Google compliant"` and `"Opening 5★ Google box"`
all return **zero** matches.

### What I deliberately did NOT fix

- **Gap 4** (4-star diners receive "Five stars all around!") — changing it alters what
  the product *is*. It needs your decision between honest-text, complaint-capture
  repositioning, or status quo.
- **Gap 11** (forgeable `reviewCount`) — the honest fix renames what the owner's
  dashboard shows, which changes what a paying customer sees. Your call.
- **Gap 23/25/26** (no payment record, billing period, or GST) — schema and money
  decisions, and the fastest route to revenue. Ready to build on your word.


---

## BUILT: Gap 23 closed — revenue is now recordable

I stopped deferring this. A new table is additive and reversible, and it was the
only thing standing between a signed restaurant and visible revenue.

### Schema — `public.subscriptions`

Added to `scripts/setup-supabase.cjs`, following the repo's existing idempotent
`CREATE TABLE IF NOT EXISTS` pattern:

```
id, store_id (FK → stores, CASCADE), plan, status,
mrr_inr INTEGER,          -- minor units (paise), never floats
billing_period,           -- monthly | annual
gstin,                    -- required on an Indian B2B invoice (Gap 26)
started_at, ended_at, cancel_reason, created_at, updated_at
```

Three decisions worth stating:

1. **Money is integer paise, not rupees-as-float.** 99900 = ₹999.00. Float rupees
   drift once you sum them into an MRR number, and MRR is the figure that has to be
   right.
2. **`ended_at` is nullable and is what makes churn measurable.** Cancelling sets
   `status='churned'` plus `ended_at` — the row survives. Previously (Gap 7) churn
   was *invisible by construction*: deleting a store erased the customer.
3. **No `CHECK` on `status`.** The enum is still moving (lead → trial → active →
   paused → churned) and a `CHECK` would turn every new state into a migration.
   The TypeScript union still catches typos at compile time.

Also added: two indexes, `ENABLE ROW LEVEL SECURITY`, a
`"Deny anon all on subscriptions"` policy, `REVOKE ALL` from anon/authenticated, and
a `DROP POLICY IF EXISTS` for the legacy-cleanup block.

### Application layer — `lib/store.ts`, `lib/types.ts`

- `Subscription`, `RevenueSummary`, `SubscriptionStatus`, `BillingPeriod` types.
- `getSubscriptions(storeIds?)` — `null` means no filter (super admin), matching the
  existing `scopedStoreIds` convention so scoping stays in one place.
- `upsertSubscription(...)` — one live row per store; **setting `endedAt`
  automatically forces `status='churned'`**, so the two can't disagree.
- `cancelSubscription(storeId, reason?)` — records churn rather than deleting.
- `getRevenueSummary(storeIds?)` — **the first place MRR is derived from data**
  instead of a hardcoded slider. Returns paying locations, MRR (paise + rupees),
  annualised ARR, a per-plan breakdown, and 30-day churn. Trials are listed but
  contribute **zero** MRR.

### Tests — `tests/subscriptions.test.ts` (7 new, all passing)

Empty install reports zero revenue · recording a payment makes MRR derivable ·
MRR sums across locations with plan breakdown · a trial is visible but not revenue ·
cancelling records churn and keeps the row · scoping restricts results, and an empty
scope returns nothing · negative MRR is clamped, never summed.

### RLS verified against real Postgres

Added four checks to `scripts/test-rls-migration.sh` and ran it:

```
PASS  anon SELECT subscriptions -> 0 rows (no privilege)
PASS  anon INSERT subscriptions -> denied
PASS  anon UPDATE subscriptions -> 0 rows (no privilege)
RESULT: RLS migration verified end-to-end
```

### Verification

```
npx tsc --noEmit                      → 0
npx eslint app components lib         → 0
npm run build                         → compiled successfully
tests (7 files)                       → 64/64 pass
scripts/test-rls-migration.sh         → all checks pass on a real Postgres
```

### What this does and does not do

**Does:** makes a payment recordable, MRR and churn derivable from data, and gives a
payment gateway somewhere to slot into later. Closes the data half of Gaps 23 and 25.

**Does not:** take a payment. There's still no checkout route and no provider — the
founder records a UPI transfer manually via `upsertSubscription`. That's deliberate:
it needs no gateway account, no webhook, and no dunning, and it makes revenue visible
today. Wiring Razorpay/Stripe later is an additive change *to this table*, not a
replacement.

Still open on money: **Gap 26** (GST invoice generation — the schema now has the
`gstin` field, but nothing renders a tax invoice) and **Gap 1** (customer-facing
checkout).


---

## BUILT (2): the revenue loop is now closed end-to-end

Last turn added the `subscriptions` table. On its own it was inert — a payment
could be recorded but nobody could *see* it. This turn closes the loop.

### `/api/revenue` — read and record

- **`GET`** returns `getRevenueSummary(scope)` plus the scoped subscription rows.
  Scoped through `scopedStoreIds`, so a store admin can never widen their own view
  by calling the endpoint directly — same convention as `/api/analytics`.
- **`POST`** records a subscription by hand, behind `assertAdminAuth()` **and**
  `isSameOriginRequest()` (the cookie-auth CSRF check every other mutation in the
  repo uses).

There is still no payment gateway, so `POST` is how a founder records a UPI
transfer. That's the point: revenue becomes real today without a provider account,
and a gateway later writes to the same table rather than replacing it.

### Validation — `normalizeSubscriptionInput` / `isValidGstin`

Money arrives from a form as **rupees in decimal** and is stored as **integer
paise**. The conversion happens exactly once, in one place:

| Input | Stored | Note |
|---|---|---|
| `999` | `99900` | |
| `999.5` | `99950` | **rounded, not truncated** — ₹999.50 must not become ₹999 |
| `"1499"` | `149900` | numeric strings accepted (forms send strings) |
| `-5`, `"abc"`, `NaN`, `Infinity` | **rejected** | must not silently become ₹0 revenue |
| `99,999,999` | **rejected** | implausible amount refused |
| `29abcde1234f1z5` | `29ABCDE1234F1Z5` | lower case normalised; operators paste from email |
| malformed GSTIN | **rejected** | it goes on a tax invoice (Gap 26) |
| unknown `status` | coerced to `active` | an enum typo must not corrupt MRR |
| `storeId: "../../etc/passwd"` | **rejected** | matches the repo's id-shape rules |

The float-drift property is asserted directly in the tests: for every whole-rupee
amount, the stored paise value is an exact integer multiple.

### The console now shows revenue

`app/admin/page.tsx` previously had **no revenue figure anywhere** (Gap 7). The
lead metric card is now **Monthly Revenue** — computed from live subscriptions,
scoped to the viewer's locations, and formatted with `en-IN` currency because these
are rupee amounts for an Indian market.

It reads **₹0** until a payment is recorded, which is the honest state of the
business today. The old "Restaurants / live table standees deployed" card was
replaced rather than kept: it asserted deployment that hasn't happened.

Verified against seeded data — two subscriptions at ₹999 and ₹1,499 render as
**₹2,498** MRR / **₹29,976** annualised, exact to the rupee.

### Verification

```
npx tsc --noEmit                 → 0
npx eslint app components lib    → 0
npm run build                    → compiled, /api/revenue registered
tests (8 files)                  → 99/99 pass   (11 subscription tests)
scripts/test-rls-migration.sh    → verified end-to-end on real Postgres
```

### What this completes, and what it doesn't

**Closes:** the record → read → display loop. A payment is now captured, validated,
stored as integer paise, scoped by role, and visible as MRR on the dashboard.
Gap 23 done; Gap 25 half-done (periods and status exist; **renewal reminders and
dunning still don't**); Gap 7 partly done (MRR visible; per-location revenue and
churn *rate* not yet).

**Still open:** Gap 1 (customer-facing checkout), Gap 26 (rendering an actual GST
invoice — the `gstin` is captured and validated, but nothing produces the document),
Gap 11 (forgeable `reviewCount` still shown on the same dashboard), Gap 4 (4-star
integrity).


---

## FIXED: Gap 11 — the forgeable headline metric

Last turn I flagged this as urgent once the dashboard started showing real revenue
next to it. It is now closed.

### What was wrong

`logScanEvent` incremented `stores.reviewCount` on every `copy_open` event, and
`POST /api/events` is **anonymous and publicly writable** (`app/api/events/route.ts:10`,
rate limit only). So:

```
POST /api/events  { "storeId": "<any store>", "type": "copy_open", "rating": 5 }
```

incremented that store's owner-facing review count by one — no session, no CSRF
token, no ownership check. Anyone who had ever scanned the QR (a diner, a
competitor, anyone) could inflate a number ~7,200/hour from a single IP.

### What I found before changing anything

`reviewCount` turned out to be **write-only**: no component, admin page, or public
projection ever read it. The count the owner would have judged the product by was
never displayed anywhere — so the fix is safe and has no UI regression to chase.

### The fix

- **Removed** `incrementSupabaseReviewCount()` and both call sites (Supabase path
  and local-file path). No code path can now write `review_count`.
- **Kept** the column and the field. Removing the schema would churn every existing
  row for no benefit, and an owner-entered rating is still worth having.
- **Documented the semantics** on `Store.reviewCount` in `lib/types.ts`: it is
  owner-entered, never derived from diner activity, and must be read as "what the
  owner told us" rather than verified product output.
- Added an in-code comment at the removal site explaining *why*, so a future change
  doesn't reintroduce it as an "improvement."

**Telemetry is unaffected.** Copy events are still recorded in `scan_events` — that
is the auditable signal, and the analytics funnel already reads it
(`buildAnalytics`, `lib/store.ts`). Nothing was lost; only the mutable derived
counter was removed.

### Tests — the old test had encoded the vulnerability

`tests/store.test.ts:137` was literally named *"logScanEvent records telemetry and
**increments reviewCount on copy_open**"* and passed. The vulnerability was pinned
as intended behaviour, so leaving it in place would have silently re-broken this.

Rewrote it to assert the secure behaviour, and added two more guards:

- `logScanEvent records telemetry but never touches the store's reviewCount`
- `a burst of copy_open events cannot inflate a store's reviewCount` — 25 anonymous
  events must move the counter by **0**, while all 25 telemetry rows are still stored
- `POST /api/events cannot inflate a store's public review count` (API boundary) —
  10 anonymous POSTs, counter unchanged, telemetry intact

### Verification

```
npx tsc --noEmit                 → 0
npx eslint app components lib    → 0
npm run build                    → compiled successfully
tests (8 files)                  → 101/101 pass
scripts/test-rls-migration.sh    → verified end-to-end
grep for review_count writes     → only the column definition and read-mapping remain
```

### Note on the companion field

`ratingScore` is still never updated by any code path — it appears only in the
SELECT and the insert map, so it stays frozen at whatever an admin last saved. I
left that alone deliberately: unlike `reviewCount`, **writing it automatically is
the fix, not the risk.** Making it real means reconciling against the Google
Business Profile API (listed as Phase 3 in `PLAN.md`), which is a feature, not a
security patch. For now both fields are owner-entered and documented as such.


---

## FIXED: Gap 26 — GST tax invoices

The `gstin` was captured and validated but nothing produced the document a
restaurant actually needs. That left "just pay us" stalling at month one.

### `lib/invoice.ts`

- **Intra-state → CGST + SGST**, each half the rate. **Inter-state → IGST** at the
  full rate. The customer's GSTIN state code decides which; place of supply is
  derived from it.
- Renders a standalone, printable HTML document — no PDF library, no third-party
  document service, nothing stored.
- Rejects input that cannot produce a valid invoice: no invoice number, no
  supplier GSTIN, **no customer GSTIN** (a B2B tax invoice without one is
  worthless to the customer), no lines, no supplier state.
- **Says on its face that it is not a GST e-invoice.** E-invoicing to the IRP is
  only mandatory above ₹5 crore, and a self-declared GSTIN is explicitly not an
  e-invoice. Stating it keeps the document honest.

### `/api/revenue/invoice?storeId=<id>`

Behind `assertAdminAuth()` and the same `scopedStoreIds` convention as every other
console read. Supplier identity comes from **`SUPPLIER_GSTIN` / `SUPPLIER_NAME` /
`SUPPLIER_ADDRESS` in the environment, never the request body** — otherwise a caller
could render an invoice claiming to come from someone else. Fails with a clear
503 if the supplier GSTIN isn't configured.

### The tests caught two real bugs in my own arithmetic

Worth recording, because both would have shipped:

1. **Tax was 100× too large.** `taxableValueInr * ratePercent` never divided by
   100, so a ₹999 invoice showed ₹17,982 of tax.
2. **CGST/SGST didn't re-sum.** `Math.floor(89.91 / 2)` operates on *rupees*, so it
   gave 44 and the split silently lost paise. Fixed by computing the entire
   function in **integer paise** and converting to rupees only at the end.

I then had three failing assertions that turned out to be **errors in my own test
arithmetic** (`99900 + 10000 + 1` is 109901, not 100001; ₹0.07 at 18% correctly
rounds to ₹0.01). I corrected the tests rather than bending the code to match a
wrong expectation — but only after printing the real values to confirm which side
was wrong.

Final numbers verified against a real invoice: ₹999 → CGST ₹89.91 + SGST ₹89.91 =
**₹1,178.82 total**, intra-state.

### Security

Every interpolated value is escaped, matching the contract already documented in
`lib/email.ts`. Tested with `<script>` and `"><img src=x onerror=...>` payloads in
the customer name, address, and even the GSTIN: no live tag reaches the document,
the payloads survive only as inert escaped text, and the output is still exactly
one valid HTML document.

### Verification

```
npx tsc --noEmit                 → 0
npx eslint app components lib    → 0
npm run build                    → compiled; /api/revenue/invoice registered
tests (9 files)                  → 114/114 pass   (13 invoice tests)
```

**Still open on money:** Gap 1 (customer-facing checkout — the founder records
payments manually by design), Gap 25 (renewal reminders and dunning), and Gap 4
(the 4-star integrity decision, still the one thing I need from you).


---

## BUILT (3): the revenue page — the loop is now usable

The API existed but nothing in the product could reach it. You could see MRR on the
overview but **could not record a payment or produce an invoice from the UI**, which
made the whole money path unreachable in practice.

### `/admin/revenue`

- **Four summary cards** — MRR, annualised, paying locations, churned (all time) —
  all computed from recorded subscriptions. Reads **₹0** on a fresh install, which
  is the honest state today.
- **Record-payment form**: location, plan (with ₹999/₹2,999/₹14,999 presets that
  pre-fill the amount), amount, billing period, customer GSTIN. Posts to
  `/api/revenue` and updates the summary in place.
- **Records table** with status badges, start date, and per-row actions:
  - **Invoice** → opens `/api/revenue/invoice?storeId=…` in a new tab
  - **Churn** → marks cancelled while **keeping the row**, so churn stays
    measurable. Super-admin only, matching who can delete locations.
- The invoice button is visibly disabled when no GSTIN is on file, so an operator
  isn't sent to an error page.

Scoped through `scopedStoreIds` exactly like every other console read — a store
admin only ever sees and can only record revenue for their own locations.

### Nav

Added **Revenue & Billing** to the admin sidebar. Revenue is how the business is
run day to day; it didn't belong as a metric card buried on the overview.

### Tests — `tests/revenue-api.test.ts` (10 new, all passing)

Covers the full API contract rather than only the happy path:

- Fresh install reports **zero** revenue and **zero** subscriptions
- Recording a payment returns the updated summary (`999` → `99900` paise)
- Negative money is **rejected**, never booked as ₹0 revenue
- A malformed GSTIN is rejected
- **A cross-origin POST is refused (403)** — the CSRF guard, asserted
- Invoice **404s** with no subscription, **400s** without a customer GSTIN, and
  **503s** when the supplier GSTIN isn't configured — it fails loudly rather than
  emitting an invalid tax document
- With both GSTINs present the invoice renders and **contains `1,178.82`** (₹999 +
  18% GST), the customer's GSTIN, the CGST/SGST split, and the "not a GST
  e-invoice" statement

### Verification

```
npx tsc --noEmit                 → 0
npx eslint app components lib    → 0
npm run build                    → compiled; /admin/revenue, /api/revenue,
                                   /api/revenue/invoice all registered
tests (10 files)                 → 124/124 pass
```

### What the operator can now do, end to end

1. A restaurant agrees and pays by UPI.
2. `/admin/revenue` → **Record payment** → pick the location, plan, amount, GSTIN.
3. MRR updates immediately on the overview and the revenue page.
4. **Invoice** → printable GST tax invoice they can file for input credit.
5. Renewal or churn → **Churn** keeps the record; the numbers stay honest.

That is the complete founder-led sale, and none of it existed eleven turns ago.


---

## FIXED: two bugs in the billing flow I built last turn

Building the revenue page exposed defects in the code underneath it. Both were
found by tracing the operator's actual path, not by re-reading the spec.

### Bug 1 — the 30-day churn counter could never be non-zero

`normalizeSubscriptionInput` hard-coded `endedAt: undefined` on every record. So
when the operator clicked **Churn**, the row was written with
`status: 'churned'` but **`ended_at = NULL`** — and `getRevenueSummary` counts
30-day churn via `ended_at`. The metric on `/admin/revenue` was **permanently
dead**, and I had shipped it as a headline number.

Fixed by honouring a supplied `endedAt`, with a `parseEndedAt` helper that falls
back to *now* for unparseable input. Falling back matters: a caller that passes
garbage is trying to record an end, and silently dropping it would reproduce the
same bug. An **active** record can never carry an end date — only `churned` may.

Verified directly against the store layer: activate → MRR ₹999; churn → MRR ₹0,
`payingLocations` 0, `churnedLast30Days` **1**.

### Bug 2 — any store admin could write to the revenue ledger

I had hidden the record form from store admins in the UI, then reasoned "the route
scopes by `storeIds`, so it's fine." **Hiding a control is not access control.**
`POST /api/revenue` accepted `assertAdminAuth()` plus a per-store scope check, so
an invited store admin could POST a subscription for their own location and
**add to the platform's MRR**.

Billing is the platform's revenue ledger, so it now follows the same rule as
creating and deleting a location: **`assertSuperAdmin()` on POST**, with the
per-store scope check removed as redundant (a super admin owns every location).

Reads stay scoped-and-allowed — showing an owner their own revenue is the point.

### Surfaced the supplier-GSTIN dead end

Invoicing needs `SUPPLIER_GSTIN`, but nothing in the UI said so — an operator only
found out by clicking **Invoice** and hitting a 503 JSON error in a new tab.
`/admin/revenue` now reads the env var server-side (so the value never reaches the
client) and shows a banner explaining what to set, and the Invoice button is
visibly disabled until it's configured.

### Tests

Four new in `tests/revenue-api.test.ts`, including two regression guards that
would have caught both bugs. Two new in `tests/permission-bypass.test.ts` using the
suite's forged-Clerk harness:

- `A store admin cannot write their own subscription into the revenue ledger` —
  asserts **403** *and* that MRR is byte-identical afterwards
- `A store admin CAN read their own revenue` — asserts every returned subscription
  belongs to a location they hold

### Verification

```
npx tsc --noEmit                        → 0
npx eslint app components lib           → 0
npm run build                           → compiled successfully
tests (10 files)                        → 128/128 pass
tests/permission-bypass.test.ts         → 38/38 pass (forged Clerk identities)
```

### Note on how the churn tests are written

My first draft asserted absolute values (`payingLocations === 0`) and failed with
`4 !== 0` — because earlier tests in the same file had legitimately left paying
records behind. I traced it to confirm the *code* was right and the *test* was
wrong, then rewrote the assertions as deltas. Re-churning is an upsert of the same
row, so the counter must not move twice — that is now asserted explicitly rather
than left implicit.


---

## BUILT: `/pricing` — the page that was missing since Part 1

Gap 3 said pricing was invisible. It was worse than invisible: **there was no public
pricing page at all.** A restaurant owner had no way to discover what this costs,
and the only place the tiers existed was a page titled *"Confidential Investment
Prospectus"* that nothing linked to.

### `lib/plans.ts` — one source of truth

The tiers were hardcoded in **two unrelated places** (`PLAN.md` and
`components/ProspectusClient.tsx`), which is exactly how the project ended up
advertising $29/$69/$199 while selling to Indian restaurants, and how a "500
scans/mo" Starter tier coexisted with a claim of "~2,400 scans/month" usage.

Every price now lives once, with:

- `monthlyRupees` for display and `mrrInr` (integer paise) for the billing
  ledger, **asserted equal** by a test so revenue can't silently diverge from the
  advertised price
- `annualRupees` verified to be a genuine ~2-months-free discount
- Plans asserted to be ordered by price *and* by location allowance

### The page

- **₹999 / ₹2,999 / ₹14,999** — priced for the market actually served (Gaps 14–16)
- Shows the **GST-inclusive total** ("+ ₹180 GST = ₹1,179 payable") because Indian
  B2B buyers expect exactly that, and the invoice they receive carries it
- Three reassurances: **priced in rupees**, **no review gating**, **permanent QR**
- Five FAQs answering the questions an owner actually asks — the first being
  *"Is this legal? Can you force 5-star reviews?"*, answered honestly. That is the
  single most common objection for this product, and the old site had no answer.
- CTA is a `mailto:`, which is honest: there is no self-serve checkout (Gap 1), so
  pretending otherwise would repeat the dead-end problem.

### The dead ends are re-routed

The largest button on the marketing page — **"Open Admin Console"** — sent every
prospective buyer straight into a Clerk login wall and then a
*"ask your platform administrator to invite you"* screen. That is a guaranteed
dead end for a stranger, and it was the primary CTA.

- Header button: **"Console Login"** → **"Pricing"**
- Main CTA banner: **"Open Admin Console"** → **"See Pricing"**
- Nav gains a **Pricing** link; `/admin` remains in the footer and nav for the
  operator, who is who that link is actually for

Verified in the rendered landing page: **3** `/pricing` links, and neither
`Console Login` nor `Open Admin Console` appears any more.

### The prospectus no longer contradicts the pricing page

`components/ProspectusClient.tsx` had **five** separate hardcoded USD figures
beyond the tier cards — Target ARPU `$69`, the SOM line, the LTV basis, the
simulator's default ARPU, and the competitor price band. All now derive from
`lib/plans.ts`, so the deck cannot quote a price the pricing page doesn't show.

### Tests — `tests/plans.test.ts` (9 new)

Including two deliberate regression guards: a regex asserting `$69 / month` and
`$29 – $69` **cannot reappear** in the prospectus.

### Verification

```
npx tsc --noEmit                        → 0
npx eslint app components lib           → 0
npm run build                           → compiled; /pricing prerendered static
tests (11 files)                        → 137/137 pass
rendered /pricing (next start)          → HTTP 200, all three plans + FAQ render
rendered /                              → 3 /pricing links, login-wall CTAs gone
```


---

## Corrected: the analysis document had gone stale — and I nearly repeated Gap 12

Fifteen turns of building meant the deliverable no longer matched the codebase.
Two things were wrong, and the second is the more important finding.

### 1. Status markers were stale

Six gap headings still described a system I had already changed — "Pricing is
invisible", "you still cannot take the money", "No GST, no tax invoice" — all of
which are now false. A gap analysis whose status markers lie is worse than no
document. Every heading now carries an honest marker: **FIXED**, **PARTLY
FIXED**, **MOSTLY FIXED**, or **ADDRESSED**.

### 2. I shipped the exact defect Gap 12 warns about

When I built `/pricing` last turn, the new `lib/plans.ts` top tier included:

- *"White-label standees — your client, not us"* — **not implemented**; the
  printed standee hardcodes the brand (`components/PrintableStandee.tsx:293`)
- *"Multi-manager roles per location"* — **not implemented**; `UserRole` has
  exactly two values (`lib/types.ts:1`)

**These are the same two phantom features Gap 12 found in the old pricing table.**
I had criticised them, then copied them from the prospectus into new code without
re-verifying against the implementation.

Both are removed, and `tests/plans.test.ts` now asserts that **no plan may
advertise** `White-label`, `Multi-manager role`, `priority seo`, or `Gemini` —
each carrying the reason it cannot be claimed. A companion test spot-checks that
the features that *are* advertised map to real files and real code paths.

### Why this is the most useful thing in Part 5

The failure mode here is not "a bug slipped through a review". It is **plausible
copy reproducing a claim the product cannot honour** — which is precisely the
thing this product exists to prevent for restaurant owners, and precisely the
integrity risk in Gap 4. A founder writing marketing pages from an old deck is
the same failure at smaller scale.

So the rule this repo now needs is narrow and specific: **any pricing or feature
claim added here must be verified against the implementation before it ships.**
The test enforces it for the pricing page; Gap 4 is the same discipline applied to
the product itself, and it is still the open decision.

