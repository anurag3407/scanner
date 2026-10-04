export type UserRole = "super_admin" | "store_admin";

/**
 * A person with console access. Super admins own the platform; store admins
 * only ever see the locations assigned to them.
 */
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** Locations a store admin may manage. Ignored for super admins. */
  storeIds: string[];
  status: "active" | "suspended";
  createdAt: string;
}

/** The signed-in console user, resolved from Clerk + the team directory. */
export interface SessionUser {
  email: string;
  role: UserRole;
  /** Empty for super admins — they implicitly own every location. */
  storeIds: string[];
  isSuperAdmin: boolean;
}

/**
 * Store-owned sentence recipes. Every line is a template:
 *   intros / closers may use {name}
 *   highlights may use {chip} (and optionally {name})
 * Empty lists fall back to the built-in sentence library.
 */
export interface ReviewTemplateSet {
  intros: string[];
  highlights: string[];
  closers: string[];
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  googlePlaceId: string;
  brandColor: string;
  accentColor?: string;
  logoUrl?: string;
  chips: string[];
  seoKeywords: string[];
  /**
   * Signature phrases the review engine weaves into drafts on top of the
   * tapped chips (e.g. "generous portions", "wood-fired oven"). More variety
   * in the word pool means Google's duplicate-spam filter never sees the same
   * sentence twice.
   */
  signatureKeywords?: string[];
  /** Draft voice for this store's generated reviews. Defaults to "punchy". */
  reviewTone?: ReviewTone;
  /** ISO 4217 code used to format menu prices (e.g. "INR", "USD"). */
  currency?: string;
  /** Owner / GM inbox that receives low-rating alerts (comma-separated for several recipients). */
  managerEmail: string;
  managerPhone: string;
  address?: string;
  tableCount?: number;
  /** Per-store sentence combinations used by the review engine. */
  reviewTemplates?: ReviewTemplateSet;
  /**
   * Owner-entered Google rating, e.g. 4.6. Set by hand from the Google
   * Business Profile — this app never reads or writes Google's API.
   */
  ratingScore: number;
  /**
   * Owner-entered count of reviews the business has on Google.
   *
   * This is NOT derived from diner activity. It used to be incremented on every
   * `copy_open` event, but that event is anonymous and publicly writable, so any
   * diner could inflate a store's headline number. It is now only ever set by
   * an authenticated admin — copy events live in `scan_events`, which is what
   * the conversion funnel reads.
   *
   * Treat it as "what the owner told us", never as verified product output.
   */
  reviewCount: number;
  createdAt: string;
}

/**
 * One dish / drink on a store's live digital menu. Served on the same QR as
 * the review flow; owners edit it from the console and diners see the change
 * on their next poll — no reprint, no re-deploy.
 */
export interface MenuItem {
  id: string;
  storeId: string;
  name: string;
  description: string;
  /** Positive number with at most 2 decimals; 0 means "ask staff". */
  price: number;
  /** Free-form section label ("Starters", "Mains", "Beverages", ...). */
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  /** Optional photo of the dish, as a direct http(s) image link. */
  imageUrl?: string;
  /** Display order within the store's menu (lower first). */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The unauthenticated diner projection of a MenuItem. */
export interface PublicMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  sortOrder: number;
}

/** Shape returned by the public polling endpoint so diners can detect changes cheaply. */
export interface PublicMenuPayload {
  storeId: string;
  /** Milliseconds since the menu last changed — clients poll this to refresh. */
  version: string;
  items: PublicMenuItem[];
}

/**
 * The strictly public projection of a Store.
 *
 * The diner scan page (`/r/[slug]`) is unauthenticated, and React serializes
 * every prop handed to a Client Component into the RSC payload in the HTML
 * source. Passing the full `Store` therefore published every store's owner
 * inbox, owner phone, SEO keywords and revenue counters to anyone who could
 * view-source the page. Anything the diner UI reads must be listed here.
 */
export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  address?: string;
  brandColor: string;
  googlePlaceId: string;
  chips: string[];
  /** Per-store sentence combinations. Falls back to the built-in library. */
  reviewTemplates?: ReviewTemplateSet;
  /** Draft voice for generated reviews; also drives the customer preview. */
  reviewTone?: ReviewTone;
  /** Extra phrases the review engine blends into drafts for uniqueness. */
  signatureKeywords?: string[];
  /** ISO 4217 code used to format menu prices on the scan page. */
  currency?: string;
}

export type ReviewTone = "punchy" | "foodie" | "hospitality";

export type ScanEventType =
  | "scan"
  | "menu_view"
  | "chip_toggle"
  | "rating_change"
  | "firewall_intercept"
  | "copy_open"
  | "feedback_submit";

export interface ScanEvent {
  id: string;
  storeId: string;
  type: ScanEventType;
  rating: number;
  chips: string[];
  reviewText?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AlertDelivery {
  status: "sent" | "failed" | "skipped";
  recipients: string[];
  sentAt?: string;
  error?: string;
}

export interface FeedbackSubmission {
  id: string;
  storeId: string;
  storeName: string;
  rating: number;
  tableNumber?: string;
  customerName?: string;
  customerContact?: string;
  message: string;
  status: "new" | "reviewed" | "resolved";
  /** Delivery record for the owner alert email (Resend). */
  alert?: AlertDelivery;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalScans: number;
  chipToggles: number;
  positiveRedirections: number;
  firewallIntercepts: number;
  complaints: number;
  redirectionRate: number;
  averageRating: number;
  avgChipsPerReview: number;
  topChips: { chip: string; count: number }[];
  recentFeedbacks: FeedbackSubmission[];
  dailyActivity: { date: string; scans: number; reviews: number; intercepts: number }[];
  recentEvents: {
    id: string;
    storeId: string;
    storeName?: string;
    type: ScanEventType;
    rating: number;
    chips: string[];
    reviewText?: string;
    timestamp: string;
  }[];
}

/**
 * A location's billing record.
 *
 * Money is stored in MINOR UNITS of INR (paise) as an integer, never as a
 * float — 99900 means ₹999.00/month. Float rupees accumulate rounding error
 * once you sum them into an MRR figure.
 */
export interface Subscription {
  id: string;
  storeId: string;
  /** Free-form plan key ("solo", "multi", "agency"). Not an enum yet. */
  plan: string;
  status: SubscriptionStatus;
  /**
   * Recurring revenue in minor units of INR per MONTH — an annual plan is
   * divided by 12 before it is stored, so summing rows yields true MRR. Excludes
   * GST, which is collected on the government's behalf. 0 means free.
   */
  mrrInr: number;
  billingPeriod: BillingPeriod;
  /** Customer's GSTIN — required on an Indian B2B tax invoice. */
  gstin?: string;
  /**
   * When the free trial began. Combined with `trialMinutes` this is the whole
   * trial: there is no cron job that could fail to expire it.
   */
  trialStartedAt?: string;
  /** Trial length in minutes, set by a super admin per location. */
  trialMinutes?: number;
  /**
   * The last instant the current paid period covers. Access runs to this
   * timestamp; a renewal pushes it forward from whichever is later, now or the
   * existing end, so an early renewal never loses paid-for days.
   */
  currentPeriodEnd?: string;
  startedAt: string;
  /** Set when the subscription ends. NULL while live — this is what makes churn measurable. */
  endedAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Lifecycle states. Kept as a union so the compiler catches typos, but the
 * database column has no CHECK constraint — adding a value here is not a
 * migration.
 */
export type SubscriptionStatus = "lead" | "trial" | "active" | "paused" | "churned";

export type BillingPeriod = "monthly" | "annual";

/* -------------------------------------------------------------------------- */
/* Billing — super-admin pricing, coupons and Razorpay payments               */
/* -------------------------------------------------------------------------- */

/**
 * A sellable plan, priced by the platform owner at runtime.
 *
 * The catalogue lives in the database, not in code: prices are set by super
 * admins from `/admin/billing`, so a price change never requires a deploy and
 * every tenant is billed the amount that was live when they subscribed.
 *
 * `priceInr` is integer paise per `period`, before the GST that is added at
 * checkout — never a float.
 */
export interface PlanConfig {
  id: string;
  name: string;
  tagline: string;
  /** Integer paise charged per period. 0 means a free plan. */
  priceInr: number;
  period: BillingPeriod;
  /**
   * Locations included in the plan. 1 = single-outlet.
   *
   * NOTE: subscriptions are recorded per location, so this is the plan's stated
   * allowance (shown on the pricing page and in the console) rather than an
   * enforced cap — there is no self-service location creation to gate, only a
   * super admin adding one. Group billing would need its own subscription
   * model before this can be enforced.
   */
  maxLocations: number;
  features: string[];
  /** Highlighted on the public pricing page. At most one plan should be. */
  featured?: boolean;
  /** Hidden plans stay in the database (existing subscribers keep them). */
  isActive: boolean;
  sortOrder: number;
  /** GST percent added on top of `priceInr` at checkout (18 for SaaS in India). */
  gstPercent: number;
  createdAt: string;
  updatedAt?: string;
}

/** How a coupon reduces the amount due. */
export type CouponDiscountType = "percent" | "amount";

/**
 * A super-admin issued discount.
 *
 * `discountValue` is interpreted by `discountType`: a percent between 1 and
 * 100, or an integer paise amount. The discount is applied to the pre-tax
 * price, so GST is always computed on the amount actually charged.
 */
export interface Coupon {
  id: string;
  /** Uppercase, unique, what the owner types at checkout. */
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  /** Total number of times the coupon may be redeemed. Undefined = unlimited. */
  maxRedemptions?: number;
  /** Derived from the redemption ledger on every read, never a blind counter. */
  timesRedeemed: number;
  /** ISO timestamp after which the coupon is refused. */
  expiresAt?: string;
  /** Restrict the coupon to one plan. Undefined = any plan. */
  planId?: string;
  /** Restrict the coupon to one location (support credit, goodwill). */
  storeId?: string;
  isActive: boolean;
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * One coupon use, written when a payment is confirmed.
 *
 * The ledger is what makes `maxRedemptions` trustworthy: the count is derived
 * from rows here rather than from a counter that a retried request could
 * increment twice. It is also the audit trail for "who got a discount, why".
 */
export interface CouponRedemption {
  id: string;
  couponId: string;
  code: string;
  storeId: string;
  planId: string;
  orderId: string;
  paymentId?: string;
  /** Discount granted, integer paise. */
  discountInr: number;
  createdAt: string;
}

export type PaymentStatus = "created" | "paid" | "failed" | "refunded";

/**
 * A checkout attempt / captured payment against Razorpay.
 *
 * `orderId` is the idempotency key: Razorpay may deliver the same event more
 * than once (and the checkout callback races the webhook), so every write that
 * turns an order into a subscription looks the order up here first and refuses
 * to double-apply it. `amountInr` is what the customer was actually charged,
 * GST and discount included, in integer paise.
 */
export interface Payment {
  id: string;
  storeId: string;
  /** Razorpay order id (`order_...`). Unique per attempt. */
  orderId: string;
  planId: string;
  period: BillingPeriod;
  /** Pre-discount, pre-tax price in paise. */
  grossInr: number;
  discountInr: number;
  /** GST charged, in paise (0 when the plan is GST-exempt). */
  taxInr: number;
  /** Total charged to the customer, in paise. */
  amountInr: number;
  couponCode?: string;
  status: PaymentStatus;
  /**
   * The buyer's GSTIN, captured at checkout.
   *
   * It lives on the payment (not just the subscription) because a webhook
   * confirmation arrives with no browser payload: without it, an annual invoice
   * generated after the customer closed the tab would have no GSTIN to print.
   */
  gstin?: string;
  /** Razorpay payment id (`pay_...`), set once captured. */
  paymentId?: string;
  /**
   * The instant the period this order buys will run to, fixed when the order
   * is created. Confirmations write THIS value rather than recomputing it, so
   * a webhook replay converges on the same period instead of granting a second
   * one.
   */
  periodEndsAt?: string;
  /** True only when the HMAC signature (or webhook signature) was verified. */
  signatureVerified: boolean;
  /** Which path confirmed the money — useful when reconciling disputes. */
  confirmedVia?: "checkout" | "webhook";
  failureReason?: string;
  createdAt: string;
  paidAt?: string;
}

/** Computed, never stored: what a location may do right now. */
export type BillingState = "none" | "trial" | "active" | "expired" | "paused" | "churned";

/**
 * The answer to "is this location allowed to customise its menu".
 *
 * Derived on every read from the subscription record and the clock, so an
 * elapsed trial locks the menu without any scheduled job — there is no worker
 * that could fall back to a false `"active"` if it stopped running.
 */
export interface StoreEntitlement {
  storeId: string;
  state: BillingState;
  /** The single flag the UI and the API gate on. */
  entitled: boolean;
  planId: string;
  planName: string;
  /** Locations the plan includes, for upgrade prompts. */
  maxLocations: number;
  /** Set while `state === "trial"`. */
  trialEndsAt?: string;
  /** Whole minutes left in the trial; 0 once elapsed. */
  trialMinutesRemaining: number;
  /** ISO timestamp the paid period runs until. */
  currentPeriodEnd?: string;
  /** Whole days left in the paid period; 0 once lapsed. */
  daysRemaining: number;
  /** Owner-facing explanation shown when `entitled` is false. */
  reason?: string;
}

/** Roll-up of recurring revenue. Every field is derived from live subscriptions. */
export interface RevenueSummary {
  /** Locations with an active or trialling subscription. */
  payingLocations: number;
  /** Sum of mrrInr across those subscriptions, in minor units. */
  mrrInr: number;
  /** MRR expressed in rupees, for display only. */
  mrrRupees: number;
  /** mrrInr x 12 — an annualised figure, NOT recognised revenue. */
  arrInr: number;
  byPlan: Record<string, { locations: number; mrrInr: number }>;
  /** Subscriptions that ended, for churn reporting. */
  churnedLast30Days: number;
}
