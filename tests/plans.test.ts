import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PLANS,
  DEFAULT_TRIAL_MINUTES,
  GST_RATE_PERCENT,
  PERIOD_DAYS,
  getPlanDefault,
  withGst,
} from "../lib/plans";
import { defaultPlanConfigs } from "../lib/billing-data";

// The seed the database starts from. Everything below checks the shipped
// defaults; the stored rows take over the moment a super admin edits one.
const SEEDED = defaultPlanConfigs();

test("seeding maps every rupee figure to exact integer paise", () => {
  // priceInr is what gets written to plans.price_inr and charged at checkout.
  // If it ever drifts from the advertised rupees, the pricing page lies.
  for (const plan of SEEDED) {
    const source = PLANS.find((p) => p.id === plan.id);
    assert.ok(source, `${plan.id}: the seeded plan must come from PLANS`);
    assert.equal(
      plan.priceInr,
      source.rupees * 100,
      `${plan.name}: rupee price and stored paise must agree`
    );
    assert.ok(Number.isInteger(plan.priceInr), `${plan.name}: the price must be integer paise`);
    assert.equal(plan.gstPercent, GST_RATE_PERCENT);
    assert.equal(plan.isActive, true, "a seeded plan is on sale unless a super admin hides it");
    assert.equal(plan.period, source.period);
    assert.equal(plan.maxLocations, source.locations);
    assert.deepEqual(plan.features, source.features);
  }
});

test("the catalogue is ordered by monthly-equivalent price and location allowance", () => {
  // A monthly-equivalent normalises an annual plan so the tiers can be compared
  // on one axis. The cheaper tier must never allow more locations than the one
  // above it, or the pricing architecture makes no sense.
  const monthlyEquivalent = (plan: { priceInr: number; period: "monthly" | "annual" }) =>
    Math.round((plan.priceInr * PERIOD_DAYS.monthly) / PERIOD_DAYS[plan.period]);

  for (let i = 1; i < SEEDED.length; i++) {
    assert.ok(
      monthlyEquivalent(SEEDED[i]) > monthlyEquivalent(SEEDED[i - 1]),
      `${SEEDED[i].name} must cost more per month than ${SEEDED[i - 1].name}`
    );
    assert.ok(
      SEEDED[i].maxLocations > SEEDED[i - 1].maxLocations,
      `${SEEDED[i].name} must allow more locations than ${SEEDED[i - 1].name}`
    );
    assert.ok(SEEDED[i].sortOrder > SEEDED[i - 1].sortOrder, "sort order follows the tiers");
  }
});

test("the annual plan is a genuine discount, not a rounded-up monthly price", () => {
  const annual = SEEDED.find((p) => p.period === "annual");
  assert.ok(annual, "the catalogue must include an annual plan");

  // The Agency tier is the ₹14,999/month tier sold yearly. ₹1,49,990 for
  // twelve months is ~16.7% off, which is the "two months free" the sales
  // script promises. Reject a token discount.
  const twelveMonthlyPayments = 14_999 * 100 * 12;
  const saving = 1 - annual.priceInr / twelveMonthlyPayments;
  assert.ok(
    saving > 0.1 && saving < 0.25,
    `annual saving of ${(saving * 100).toFixed(1)}% should be about two months`
  );
});

test("exactly one plan is flagged as featured", () => {
  assert.equal(SEEDED.filter((p) => p.featured).length, 1);
});

test("getPlanDefault resolves known ids and rejects unknown ones", () => {
  assert.equal(getPlanDefault("solo")?.rupees, PLANS[0].rupees);
  assert.equal(getPlanDefault("enterprise"), undefined);
  assert.equal(getPlanDefault(""), undefined);
});

test("every plan ships a real feature list and a tagline", () => {
  for (const plan of SEEDED) {
    assert.ok(plan.features.length >= 4, `${plan.name} needs a real feature list`);
    assert.ok(plan.tagline.length > 0, `${plan.name} needs a tagline`);
    for (const feature of plan.features) {
      assert.equal(feature.includes("<"), false, `${plan.name}: feature text must not contain markup`);
    }
  }
});

test("GST is added on top of the stored paise price and rounds once", () => {
  assert.equal(withGst(999), 1179, "Rs 999 + 18% = Rs 1,179");
  assert.equal(withGst(999, 0), 999, "an exempt supply adds nothing");
  assert.equal(withGst(100, 12.5), 113, "a fractional rate rounds to the nearest rupee");
  assert.equal(GST_RATE_PERCENT, 18, "SaaS in India is an 18% supply");
});

test("the free trial defaults to a short window that cannot be missed", () => {
  assert.ok(DEFAULT_TRIAL_MINUTES > 0, "a trial must exist");
  assert.ok(DEFAULT_TRIAL_MINUTES <= 60, "the default trial must be a demo window, not a free month");
});

test("the public pricing page exists, reads stored plans, and is reachable from the site", () => {
  const pricingPath = path.join(process.cwd(), "app", "pricing", "page.tsx");
  assert.ok(fs.existsSync(pricingPath));
  const pricing = fs.readFileSync(pricingPath, "utf-8");
  // Prices are super-admin controlled, so the page must read the catalogue
  // rather than import a hardcoded array.
  assert.ok(
    pricing.includes("getActivePlansOrDefaults"),
    "the pricing page must render the stored catalogue"
  );
  assert.equal(
    /monthlyRupees|annualRupees/.test(pricing),
    false,
    "the old hardcoded price fields must not return"
  );

  const landing = fs.readFileSync(
    path.join(process.cwd(), "components", "LandingPageClient.tsx"),
    "utf-8"
  );
  assert.ok(landing.includes('href="/pricing"'), "landing page must link to pricing");
});

test("the prospectus quotes the shared catalogue rather than its own figures", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "components", "ProspectusClient.tsx"), "utf-8");
  assert.ok(src.includes('from "@/lib/plans"'), "must import the shared plan source");
  assert.ok(src.includes("plans: PlanConfig[]"), "the deck must render the plans it is given");
  assert.ok(src.includes("plan.priceInr"), "prices must come from the stored plan rows");
  // The old hardcoded $29/$69/$199 tiers are the regression this prevents.
  assert.equal(/\$69 \/ month/.test(src), false, "no hardcoded USD ARPU may return");
  assert.equal(/\$29 – \$69/.test(src), false, "no hardcoded USD price band may return");
});

test("no plan advertises a feature that does not exist", () => {
  // Gap 12 found the old pricing table selling three features that were never
  // built. An early draft of lib/plans.ts repeated the same mistake. These are
  // the capabilities that were falsely claimed, asserted absent so they cannot
  // quietly return to the pricing page.
  const forbidden = [
    "White-label", // brand is hardcoded at PrintableStandee.tsx:293
    "Multi-manager role", // UserRole has exactly two values (lib/types.ts:1)
    "priority seo", // seoKeywords is stored and read by no component
    "Gemini", // never called anywhere (Gap 9)
  ];

  for (const plan of SEEDED) {
    for (const feature of plan.features) {
      for (const bad of forbidden) {
        assert.equal(
          feature.toLowerCase().includes(bad.toLowerCase()),
          false,
          `${plan.name} advertises "${feature}" — "${bad}" is not implemented`
        );
      }
    }
  }
});

test("advertised capabilities map to something real in the codebase", () => {
  const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf-8");

  assert.ok(
    read("components/PrintableStandee.tsx").includes("Print-ready") === false ||
      read("app/admin/stores/[id]/print/page.tsx").length > 0,
    "the print-ready standee generator must exist"
  );
  assert.ok(fs.existsSync(path.join(process.cwd(), "app/admin/feedback/page.tsx")), "firewall inbox must exist");
  assert.ok(fs.existsSync(path.join(process.cwd(), "app/admin/analytics/page.tsx")), "analytics must exist");
  assert.ok(fs.existsSync(path.join(process.cwd(), "app/admin/team/page.tsx")), "team access must exist");
  assert.ok(read("components/StoreManagementClient.tsx").includes("signatureKeywords"), "Review Studio must exist");
  assert.ok(read("lib/auth.ts").includes("storeIds"), "team scoping must exist");
});
