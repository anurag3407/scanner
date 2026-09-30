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
  managerEmail: string;
  managerPhone: string;
  address?: string;
  tableCount?: number;
  ratingScore: number;
  reviewCount: number;
  createdAt: string;
}

export type ReviewTone = 'punchy' | 'foodie' | 'hospitality';

export type ScanEventType =
  | 'scan'
  | 'chip_toggle'
  | 'rating_change'
  | 'firewall_intercept'
  | 'copy_open'
  | 'feedback_submit';

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

export interface FeedbackSubmission {
  id: string;
  storeId: string;
  storeName: string;
  rating: number;
  tableNumber?: string;
  customerName?: string;
  customerContact?: string;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
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
  topChips: { chip: string; count: number }[];
  recentFeedbacks: FeedbackSubmission[];
  dailyActivity: { date: string; scans: number; reviews: number; intercepts: number }[];
}
