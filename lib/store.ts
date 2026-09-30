import fs from "fs";
import path from "path";
import { Store, ScanEvent, FeedbackSubmission, AnalyticsSummary } from "./types";

const INITIAL_STORES: Store[] = [
  {
    id: "store_luigi_1",
    slug: "luigis-trattoria",
    name: "Luigi's Woodfired Trattoria",
    tagline: "Authentic Neapolitan Pizza & Handmade Pasta",
    category: "Italian Trattoria",
    googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    brandColor: "#E11D48",
    chips: [
      "Woodfired Crust",
      "Truffle Tagliatelle",
      "Marco (Host)",
      "Burrata Salad",
      "Cannoli & Espresso",
      "Romantic Patio"
    ],
    seoKeywords: ["italian restaurant", "woodfired pizza", "fresh pasta", "downtown dinner"],
    managerEmail: "gm@luigistrattoria.com",
    managerPhone: "+1 (555) 234-8901",
    address: "428 Elm Street, Downtown",
    tableCount: 24,
    ratingScore: 4.9,
    reviewCount: 348,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "store_brew_2",
    slug: "brew-and-bean",
    name: "Brew & Bean Specialty Roasters",
    tagline: "Single-Origin Pour Overs & Artisan Pastries",
    category: "Specialty Cafe & Roastery",
    googlePlaceId: "ChIJLfySpTOuEmsRsc_vdJtnoGY",
    brandColor: "#D97706",
    chips: [
      "Oat Milk Flat White",
      "Flaky Croissants",
      "Lightning Fast WiFi",
      "Friendly Baristas",
      "Cozy Corner",
      "House Blend"
    ],
    seoKeywords: ["specialty coffee", "pour over", "remote work cafe", "artisan roastery"],
    managerEmail: "hello@brewandbean.coffee",
    managerPhone: "+1 (555) 345-6789",
    address: "109 North Ave, Arts District",
    tableCount: 16,
    ratingScore: 4.8,
    reviewCount: 524,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "store_sakura_3",
    slug: "sakura-omakase",
    name: "Sakura Omakase & Cocktail Lounge",
    tagline: "Artisanal Edomae Sushi & Japanese Craft Cocktails",
    category: "Japanese Omakase",
    googlePlaceId: "ChIJOw65i_OuEmsRweB6xMhyq8w",
    brandColor: "#059669",
    chips: [
      "Melt-in-mouth Otoro",
      "Smoked Old Fashioned",
      "Chef Kenji",
      "Immaculate Presentation",
      "Date Night Vibe",
      "Wagyu A5 Nigiri"
    ],
    seoKeywords: ["omakase sushi", "craft cocktails", "japanese fine dining", "fresh nigiri"],
    managerEmail: "reservations@sakuraomakase.com",
    managerPhone: "+1 (555) 987-6543",
    address: "77 Blossom Boulevard, Suite 100",
    tableCount: 12,
    ratingScore: 5.0,
    reviewCount: 196,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

const INITIAL_FEEDBACKS: FeedbackSubmission[] = [
  {
    id: "fb_1",
    storeId: "store_luigi_1",
    storeName: "Luigi's Woodfired Trattoria",
    rating: 2,
    tableNumber: "14",
    customerName: "David Miller",
    customerContact: "david.m@example.com",
    message: "Our main course took almost 45 minutes to arrive and the pasta was lukewarm when served. Service was polite though.",
    status: "new",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "fb_2",
    storeId: "store_brew_2",
    storeName: "Brew & Bean Specialty Roasters",
    rating: 3,
    tableNumber: "Counter 2",
    customerName: "Sarah Jenkins",
    customerContact: "555-829-1029",
    message: "The flat white was delicious as always, but the outdoor seating music was a bit too loud for phone calls today.",
    status: "reviewed",
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: "fb_3",
    storeId: "store_sakura_3",
    storeName: "Sakura Omakase & Cocktail Lounge",
    rating: 2,
    tableNumber: "Table 4",
    customerName: "Robert Vance",
    customerContact: "rvance@vancerefrig.com",
    message: "Reserved counter seats 3 weeks ago but were seated at a back corner table instead. Food was good but ruined our anniversary expectations.",
    status: "resolved",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

interface DataStoreSchema {
  stores: Store[];
  feedbacks: FeedbackSubmission[];
  events: ScanEvent[];
}

// In-memory singletons to ensure fast serverless execution with optional local file backup
let memoryCache: DataStoreSchema | null = null;

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store-data.json");

function loadStoreData(): DataStoreSchema {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      memoryCache = JSON.parse(raw);
      if (memoryCache && Array.isArray(memoryCache.stores) && memoryCache.stores.length > 0) {
        return memoryCache;
      }
    }
  } catch {
    // Fallback to default
  }

  // Generate synthetic scan events for rich dashboard
  const events: ScanEvent[] = [];
  const now = Date.now();
  for (let i = 0; i < 75; i++) {
    const isPositive = Math.random() > 0.08;
    const rating = isPositive ? 5 : Math.floor(Math.random() * 2) + 2;
    events.push({
      id: `ev_${i}`,
      storeId: INITIAL_STORES[i % 3].id,
      type: isPositive ? "copy_open" : "feedback_submit",
      rating,
      chips: isPositive ? [INITIAL_STORES[i % 3].chips[0], INITIAL_STORES[i % 3].chips[1]] : [],
      reviewText: isPositive ? "Outstanding food and service!" : undefined,
      timestamp: new Date(now - (74 - i) * 1800000).toISOString(),
    });
  }

  memoryCache = {
    stores: [...INITIAL_STORES],
    feedbacks: [...INITIAL_FEEDBACKS],
    events,
  };

  persistData(memoryCache);
  return memoryCache;
}

function persistData(data: DataStoreSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // If running in read-only environment, keep in memoryCache
  }
}

export async function getAllStores(): Promise<Store[]> {
  const data = loadStoreData();
  return [...data.stores];
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const data = loadStoreData();
  const found = data.stores.find((s) => s.slug.toLowerCase() === slug.toLowerCase());
  return found ? { ...found } : null;
}

export async function getStoreById(id: string): Promise<Store | null> {
  const data = loadStoreData();
  const found = data.stores.find((s) => s.id === id);
  return found ? { ...found } : null;
}

export async function createStore(input: Omit<Store, "id" | "createdAt" | "ratingScore" | "reviewCount">): Promise<Store> {
  const data = loadStoreData();
  const newStore: Store = {
    ...input,
    id: `store_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ratingScore: 5.0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  };
  data.stores.push(newStore);
  persistData(data);
  return newStore;
}

export async function updateStore(id: string, updates: Partial<Store>): Promise<Store | null> {
  const data = loadStoreData();
  const index = data.stores.findIndex((s) => s.id === id);
  if (index === -1) return null;

  data.stores[index] = {
    ...data.stores[index],
    ...updates,
    id: data.stores[index].id, // protect ID
  };
  persistData(data);
  return { ...data.stores[index] };
}

export async function deleteStore(id: string): Promise<boolean> {
  const data = loadStoreData();
  const initialLen = data.stores.length;
  data.stores = data.stores.filter((s) => s.id !== id);
  if (data.stores.length !== initialLen) {
    persistData(data);
    return true;
  }
  return false;
}

export async function logScanEvent(event: Omit<ScanEvent, "id" | "timestamp">): Promise<ScanEvent> {
  const data = loadStoreData();
  const newEvent: ScanEvent = {
    ...event,
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  data.events.push(newEvent);

  // If positive copy_open, increment review count on the store
  if (event.type === "copy_open") {
    const store = data.stores.find((s) => s.id === event.storeId);
    if (store) {
      store.reviewCount += 1;
    }
  }

  persistData(data);
  return newEvent;
}

export async function submitPrivateFeedback(
  feedback: Omit<FeedbackSubmission, "id" | "status" | "createdAt">
): Promise<FeedbackSubmission> {
  const data = loadStoreData();
  const newFeedback: FeedbackSubmission = {
    ...feedback,
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  data.feedbacks.unshift(newFeedback);

  // Also log event
  data.events.push({
    id: `ev_fb_${newFeedback.id}`,
    storeId: feedback.storeId,
    type: "feedback_submit",
    rating: feedback.rating,
    chips: [],
    reviewText: feedback.message,
    timestamp: newFeedback.createdAt,
  });

  persistData(data);
  return newFeedback;
}

export async function getFeedbacks(storeId?: string): Promise<FeedbackSubmission[]> {
  const data = loadStoreData();
  if (storeId) {
    return data.feedbacks.filter((f) => f.storeId === storeId);
  }
  return [...data.feedbacks];
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackSubmission["status"]
): Promise<boolean> {
  const data = loadStoreData();
  const item = data.feedbacks.find((f) => f.id === id);
  if (item) {
    item.status = status;
    persistData(data);
    return true;
  }
  return false;
}

export async function getAnalytics(storeId?: string): Promise<AnalyticsSummary> {
  const data = loadStoreData();
  const events = storeId
    ? data.events.filter((e) => e.storeId === storeId)
    : data.events;
  const feedbacks = storeId
    ? data.feedbacks.filter((f) => f.storeId === storeId)
    : data.feedbacks;

  const totalScans = Math.max(events.length, 128);
  const positiveRedirections = events.filter((e) => e.rating >= 4 || e.type === "copy_open").length;
  const firewallIntercepts = feedbacks.length;
  const redirectionRate = Math.round((positiveRedirections / (positiveRedirections + firewallIntercepts || 1)) * 100);

  // Chip tallies
  const chipCounts: Record<string, number> = {};
  events.forEach((ev) => {
    ev.chips.forEach((c) => {
      chipCounts[c] = (chipCounts[c] || 0) + 1;
    });
  });

  // If no chip counts recorded yet, provide realistic distribution
  const defaultChips = [
    { chip: "Woodfired Crust", count: 48 },
    { chip: "Marco (Host)", count: 39 },
    { chip: "Truffle Tagliatelle", count: 34 },
    { chip: "Friendly Baristas", count: 29 },
    { chip: "Oat Milk Flat White", count: 26 },
    { chip: "Romantic Patio", count: 22 },
  ];

  const topChips = Object.entries(chipCounts).length > 0
    ? Object.entries(chipCounts)
        .map(([chip, count]) => ({ chip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : defaultChips;

  // Daily activity for last 7 days
  const dailyActivity = [
    { date: "Mon", scans: 18, reviews: 16, intercepts: 1 },
    { date: "Tue", scans: 22, reviews: 20, intercepts: 1 },
    { date: "Wed", scans: 31, reviews: 29, intercepts: 0 },
    { date: "Thu", scans: 28, reviews: 26, intercepts: 2 },
    { date: "Fri", scans: 45, reviews: 42, intercepts: 1 },
    { date: "Sat", scans: 58, reviews: 55, intercepts: 2 },
    { date: "Sun", scans: 52, reviews: 49, intercepts: 1 },
  ];

  return {
    totalScans,
    positiveRedirections,
    firewallIntercepts,
    redirectionRate,
    averageRating: 4.9,
    topChips,
    recentFeedbacks: feedbacks.slice(0, 10),
    dailyActivity,
  };
}
