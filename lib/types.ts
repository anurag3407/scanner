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

export type ReviewTone = "punchy" | "foodie" | "hospitality";

export type ScanEventType =
  | "scan"
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
