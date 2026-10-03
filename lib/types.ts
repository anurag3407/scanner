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
  ratingScore: number;
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
