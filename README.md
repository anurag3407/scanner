# ReviewBoost Scanner ⚡

> **The Zero-Friction Restaurant Review Engine & Reputation Firewall**  
> Turn table diners into verified 5-star Google Reviews in 10 seconds flat.

---

## 🚀 Key Mechanics & Capabilities

1. **Customer Scan Experience (`/r/[slug]`)**:
   - **0ms Pre-Drafted Review**: When a diner scans the table QR code, an authentic 5-star review is already generated and pre-selected.
   - **Interactive Feature Chips**: Diners tap dishes, server names, or ambiance perks (e.g., *"Speciality Cold Brew"*, *"Santosh (Barista)"*, *"Avocado Toast"*) to dynamically re-seed the review in under 400ms.
   - **1-Tap Hand-Off**: "Copy Review & Open Google" copies the drafted review to `navigator.clipboard`, fires festive celebration confetti, and deep-links directly to Google Reviews (`https://search.google.com/local/writereview?placeid=<PLACE_ID>`).
   - **Reputation Firewall**: If a diner taps 1, 2, or 3 stars, the public Google Reviews link is immediately suppressed and replaced with a private General Manager resolution form to resolve complaints on-site before public damage occurs.

2. **Review Studio & Team Access**:
   - **Per-store sentence combinations** (`/admin/stores` → Review Studio): each location owns its intros, dish highlights and closers, with a live diner preview and placeholder tokens (`{name}`, `{store}`, `{chip}`, `{category}`). Empty lists fall back to the built-in library, so nothing breaks before an owner writes their own lines.
   - **Permanent QR codes**: printed standees encode the immutable store id, so dishes, staff names and sentence combinations can change anytime without a reprint.
   - **Role-based access** (`/admin/team`): the platform owner (super admin) manages every location and invites store admins, who only see and edit the locations assigned to them.

3. **Internal Admin Dashboard (`/admin`)**:
   - Requires a signed-in Clerk user (see below).
   - **Pulse Overview (`/admin`)**: Real scan, hand-off, firewall intercept, and average diner rating metrics computed from recorded table activity.
   - **Store Manager (`/admin/stores`)**: Add/edit locations, configure Google Place IDs, brand colors, owner alert inboxes, custom 1-tap feature tags, and each store's sentence combinations via the Review Studio (super admin creates and deletes locations; store admins manage their own).
   - **Team & Access (`/admin/team`)**: Invite store admins, assign locations, suspend or remove access — owner-controlled RBAC.
   - **Reputation Firewall Inbox (`/admin/feedback`)**: Real-time log of intercepted 1-3 star dining complaints with table numbers, customer contact, resolution status toggles, and the record of which owner inboxes were alerted.
   - **Scan Telemetry (`/admin/analytics`)**: Conversion funnel metrics, daily activity heatmaps, and local Google SEO ranking impact.
   - **Printable Table Standee Generator (`/admin/[id]/print`)**: Print-ready 4x6" dual-sided foldable table tents and counter acrylic inserts with cutting/folding guides formatted for `@media print`.

4. **SaaS Prospectus & Pitch Deck (`/admin/prospectus`)**:
   - Comprehensive investor & franchise prospectus breaking down the $4.8B market opportunity, $69/mo unit economics (88% gross margin, 6.6x LTV/CAC), viral QR distribution loop, and restaurant sales closing scripts.

5. **SaaS Marketing Landing Page (`/`)**:
   - High-converting B2B landing page with an interactive scanner widget, 3-step flywheel explainer, growth + reputation pillars, and a role-based team access section.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Icons**: Lucide React
- **QR Engine**: `qrcode` data URI generation
- **Micro-interactions**: `canvas-confetti`
- **AI Engine**: Google Gemini 2.5 Flash / 1.5 Flash with instant 0ms deterministic heuristic engine fallback (100% free-tier and offline friendly).
- **Authentication & RBAC**: Clerk (`@clerk/nextjs`) plus a `team_members` directory. The `ADMIN_ALLOWED_EMAIL` account is the super admin; invited store admins only see their assigned locations. Diner scan pages, review generation, and the private feedback form stay public.
- **Data Store**: Supabase PostgreSQL is the source of truth (locations, firewall feedback, scan telemetry). When Supabase env vars are absent, the app falls back to a local JSON file at `.data/store-data.json` for development and tests. **No demo data is ever seeded** — dashboards compute only from real activity.

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure the Database (Supabase)
Create a Supabase project and apply the schema:
```bash
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" \
  node scripts/setup-supabase.cjs
```
Then copy the project URL and keys into `.dev.vars` (Cloudflare local runtime) or `.env.local` (Next.js dev server) — see `.env.example`. Without Supabase the app uses a local JSON file, which does not persist on Cloudflare Workers.

### 3. Configure Admin Authentication (Clerk)
Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com), then set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Without keys the public review experience still works — `/admin` redirects to a setup notice and store-management APIs return `503` rather than exposing your data. Production deployments need both values as Worker secrets:
```bash
npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
```

### 4. (Optional) Configure Gemini API
Set your Gemini API key in `.env.local` to enable Gemini 2.5 Flash real-time generation:
```bash
GEMINI_API_KEY="your-gemini-api-key"
```
*Note: If no API key is set, the application automatically uses the instant 0ms deterministic review generator with full functionality.*

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Add your first restaurant location from `/admin/stores` (you will be asked to sign in).

### 6. Run Automated Tests
```bash
npm test
```
Runs 18 automated tests covering AI generation, store CRUD, the reputation firewall, analytics math, and API validation. Tests run against an isolated temp file and never touch your Supabase data.

### 7. Production Build
```bash
npm run build
```
Compiles static and dynamic routes with zero warnings.

---

| Route | Description |
|---|---|
| `/` | SaaS Marketing Landing Page with live interactive scanner widget & ROI calculator |
| `/prospectus` | Public institutional SaaS prospectus, interactive ARR financial model & printable PDF memorandum |
| `/r/[scan-key]` | Customer mobile scan landing page (permanent store id, slug alias) with pre-drafted review & Reputation Firewall |
| `/sign-in` | Clerk sign-in page for the admin console |
| `/admin` | Main executive overview dashboard & scan telemetry |
| `/admin/stores` | Store location management, Review Studio sentence combinations, custom chip tags, and direct links |
| `/admin/stores/[id]/print` | 4x6" printable table tent & acrylic counter plaque generator (encodes the permanent store id) |
| `/admin/team` | Super-admin team directory: invite store admins, assign locations, suspend access |
| `/admin/feedback` | Reputation Firewall private manager feedback inbox (scoped by role) |
| `/admin/analytics` | Table conversion funnel & diner highlight chips analytics (scoped by role) |
| `/admin/prospectus` | Admin suite access to investor prospectus & financial model |
| `/api/stores` | List (scoped) & create (super admin) stores |
| `/api/stores/[id]` | Get & update (assigned stores), delete (super admin) locations |
| `/api/team` | List & invite team members (super admin only) |
| `/api/team/[id]` | Update or remove a team member (super admin only) |
| `/api/generate-review` | AI & deterministic review generator |
| `/api/events` | Table scan & review copy event telemetry logging |
| `/api/feedback` | Reputation Firewall complaint submissions & status updates |
| `/api/analytics` | Telemetry summaries & conversion metrics |

---

## 📋 Strategic Execution Plan
See [`PLAN.md`](./PLAN.md) for the complete product specification, latency budget analysis, unit economics breakdown, and multi-phase SaaS roadmap.
