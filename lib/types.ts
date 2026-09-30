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

export interface ScanEvent {
  id: string;
  storeId: string;
  type: 'scan' | 'chip_toggle' | 'rating_change' | 'copy_open' | 'feedback_submit';
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
  positiveRedirections: number;
  firewallIntercepts: number;
  redirectionRate: number;
  averageRating: number;
  topChips: { chip: string; count: number }[];
  recentFeedbacks: FeedbackSubmission[];
  dailyActivity: { date: string; scans: number; reviews: number; intercepts: number }[];
}
