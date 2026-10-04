/**
 * The pricing plans — default catalogue.
 *
 * These are the values a fresh install is seeded with. Once a super admin
 * edits a plan from `/admin/billing`, the database row is authoritative and
 * these defaults are no longer consulted (see `lib/billing-data.ts`): a price
 * change must never require a deploy, and every tenant is billed the amount
 * that was live when they subscribed.
 *
 * Amounts are **INR in whole rupees** for display, plus an integer paise figure
 * for the billing ledger (`priceInr`) so the two can never drift.
 *
 * Priced for the market this product is actually sold into — independent
 * Indian restaurants — rather than the US, where the published entry point in
 * this category is $99/mo. See REVENUE-GAPS.md Gaps 14-16.
 */

import type { BillingPeriod } from "./types";

export type PlanId = "solo" | "multi" | "agency";

/**
 * A default plan. Structurally a `PlanConfig` minus the fields the data layer
 * owns, so seeding cannot invent an id that disagrees with the row.
 */
export interface PlanDefault {
  id: PlanId;
  name: string;
  /** Price in whole rupees for one `period`, before GST. */
  rupees: number;
  period: BillingPeriod;
  locations: number;
  tagline: string;
  features: string[];
  /** Marks the plan the docs call the flagship. */
  featured?: boolean;
}

export const PLANS: PlanDefault[] = [
  {
    id: "solo",
    name: "Solo",
    rupees: 999,
    period: "monthly",
    locations: 1,
    tagline: "One table, one QR, ten seconds a review.",
    features: [
      "1 location with a permanent QR standee",
      "0ms pre-drafted review hand-off to Google",
      "Live digital menu on the same QR",
      "Reputation Firewall (1–3★ resolved privately)",
      "Print-ready 4x6\" table tent generator",
      "Email support",
    ],
  },
  {
    id: "multi",
    name: "Multi",
    rupees: 2999,
    period: "monthly",
    locations: 3,
    tagline: "For a group of outlets run by one team.",
    featured: true,
    features: [
      "Up to 3 locations, permanent QR per site",
      "Everything in Solo, per location",
      "Review Studio — keywords, tone, sentence library",
      "Per-location analytics and conversion funnel",
      "Firewall inbox with owner alerting",
      "Team access — add a manager per outlet",
      "Priority email support",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    rupees: 149990,
    period: "annual",
    locations: 10,
    tagline: "For consultants and franchise groups. Billed yearly.",
    features: [
      "Up to 10 locations under one account",
      "Everything in Multi",
      // NOTE: "White-label standees" and "Multi-manager roles per location"
      // appeared in an earlier draft of this file and were REMOVED — neither is
      // implemented. The printed standee hardcodes the brand
      // (components/PrintableStandee.tsx:293) and UserRole has exactly two
      // values (lib/types.ts). Promising them again would repeat Gap 12.
      "Central menu + review configuration",
      "Onboarding assistance",
    ],
  },
];

export const getPlanDefault = (id: string): PlanDefault | undefined =>
  PLANS.find((p) => p.id === id);

/** The GST rate applied to every plan unless a super admin overrides it. */
export const GST_RATE_PERCENT = 18;

/** The default free-trial length in minutes. A new location starts here. */
export const DEFAULT_TRIAL_MINUTES = 30;

/** Days added to a subscription when a payment is confirmed. */
export const PERIOD_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  annual: 365,
};

/**
 * GST-inclusive price for display.
 *
 * B2B pricing in India is quoted exclusive of GST — the customer pays it on top
 * and claims input credit. Showing both numbers is what an Indian restaurant
 * owner expects to see.
 */
export const withGst = (rupees: number, ratePercent = GST_RATE_PERCENT): number =>
  Math.round(rupees * (1 + ratePercent / 100));