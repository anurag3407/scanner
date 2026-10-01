import fs from "fs";
import path from "path";
import {
  Store,
  ScanEvent,
  ScanEventType,
  FeedbackSubmission,
  AnalyticsSummary,
  TeamMember,
  AlertDelivery,
  ReviewTemplateSet,
} from "./types";
import { getSupabaseClient } from "./supabase";
import { sanitizeTemplateSet } from "./validation";

interface DataStoreSchema {
  stores: Store[];
  feedbacks: FeedbackSubmission[];
  events: ScanEvent[];
  members: TeamMember[];
}

let memoryCache: DataStoreSchema | null = null;
let memoryCacheFile: string | null = null;

function getDataFile(): string {
  return process.env.STORE_DATA_FILE || path.join(process.cwd(), ".data", "store-data.json");
}

function emptyData(): DataStoreSchema {
  return { stores: [], feedbacks: [], events: [], members: [] };
}

function loadLocalData(): DataStoreSchema {
  const file = getDataFile();
  if (memoryCache && memoryCacheFile === file) {
    return memoryCache;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf-8"));
    memoryCache = {
      stores: Array.isArray(parsed?.stores) ? parsed.stores : [],
      feedbacks: Array.isArray(parsed?.feedbacks) ? parsed.feedbacks : [],
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      members: Array.isArray(parsed?.members) ? parsed.members : [],
    };
    memoryCacheFile = file;
    return memoryCache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error(`Failed to read local data file at ${file}`, err);
    }
  }

  memoryCache = emptyData();
  memoryCacheFile = file;
  return memoryCache;
}

function persistLocalData(data: DataStoreSchema) {
  try {
    const file = getDataFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(
      "Failed to persist local store data. In serverless environments (Cloudflare Workers) configure Supabase so data is stored persistently.",
      err
    );
  }
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject<T>(val: unknown): T | undefined {
  if (!val) return undefined;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object") return parsed as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseTemplateSet(val: unknown): ReviewTemplateSet | undefined {
  return sanitizeTemplateSet(parseJsonObject(val));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToStore(r: any): Store {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline || "",
    category: r.category || "Restaurant",
    googlePlaceId: r.google_place_id || r.googlePlaceId || "",
    brandColor: r.brand_color || r.brandColor || "#E11D48",
    accentColor: r.accent_color || r.accentColor || undefined,
    logoUrl: r.logo_url || r.logoUrl || undefined,
    chips: parseJsonArray(r.chips),
    seoKeywords: parseJsonArray(r.seo_keywords || r.seoKeywords),
    managerEmail: r.manager_email || r.managerEmail || "",
    managerPhone: r.manager_phone || r.managerPhone || "",
    address: r.address || "",
    tableCount: Number(r.table_count ?? r.tableCount) || 0,
    reviewTemplates: parseTemplateSet(r.review_templates ?? r.reviewTemplates),
    ratingScore: Number(r.rating_score ?? r.ratingScore) || 0,
    reviewCount: Number(r.review_count ?? r.reviewCount) || 0,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStoreToRow(s: Store): any {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline || "",
    category: s.category || "Restaurant",
    google_place_id: s.googlePlaceId,
    brand_color: s.brandColor,
    accent_color: s.accentColor || null,
    logo_url: s.logoUrl || null,
    chips: s.chips || [],
    seo_keywords: s.seoKeywords || [],
    manager_email: s.managerEmail || "",
    manager_phone: s.managerPhone || "",
    address: s.address || "",
    table_count: s.tableCount || 0,
    review_templates: s.reviewTemplates || null,
    rating_score: s.ratingScore || 0,
    review_count: s.reviewCount || 0,
    created_at: s.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToFeedback(r: any): FeedbackSubmission {
  return {
    id: r.id,
    storeId: r.store_id || r.storeId,
    storeName: r.store_name || r.storeName || "",
    rating: Number(r.rating) || 0,
    tableNumber: r.table_number || r.tableNumber || undefined,
    customerName: r.customer_name || r.customerName || undefined,
    customerContact: r.customer_contact || r.customerContact || undefined,
    message: r.message,
    status: r.status,
    alert: parseJsonObject<AlertDelivery>(r.alert),
    createdAt: r.created_at || r.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToMember(r: any): TeamMember {
  return {
    id: r.id,
    email: String(r.email || "").toLowerCase().trim(),
    name: r.name || "",
    role: r.role === "super_admin" ? "super_admin" : "store_admin",
    storeIds: parseJsonArray(r.store_ids || r.storeIds),
    status: r.status === "suspended" ? "suspended" : "active",
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMemberToRow(m: TeamMember): any {
  return {
    id: m.id,
    email: m.email,
    name: m.name,
    role: m.role,
    store_ids: m.storeIds || [],
    status: m.status,
    created_at: m.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToEvent(r: any): ScanEvent {
  return {
    id: r.id,
    storeId: r.store_id || r.storeId,
    type: r.type,
    rating: Number(r.rating) || 0,
    chips: parseJsonArray(r.chips),
    reviewText: r.review_text || r.reviewText || undefined,
    userAgent: r.user_agent || r.userAgent || undefined,
    timestamp: r.timestamp || r.created_at || new Date().toISOString(),
  };
}

export async function getAllStores(): Promise<Store[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to load stores from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToStore);
  }

  return [...loadLocalData().stores];
}

/** Loads only the locations a store admin is assigned to. Super admins use getAllStores(). */
export async function getStoresByIds(storeIds: string[]): Promise<Store[]> {
  if (storeIds.length === 0) return [];

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .in("id", storeIds)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to load stores from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToStore);
  }

  const wanted = new Set(storeIds);
  return loadLocalData().stores.filter((s) => wanted.has(s.id));
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const normalized = slug.toLowerCase().trim();
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", normalized)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load store "${slug}" from Supabase: ${error.message}`);
    }
    return data ? mapRowToStore(data) : null;
  }

  const found = loadLocalData().stores.find((s) => s.slug.toLowerCase() === normalized);
  return found ? { ...found } : null;
}

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load store "${id}" from Supabase: ${error.message}`);
    }
    return data ? mapRowToStore(data) : null;
  }

  const found = loadLocalData().stores.find((s) => s.id === id);
  return found ? { ...found } : null;
}

/**
 * Resolves the permanent QR target. Printed standees encode the immutable store
 * id, so items, dishes, staff names and sentence combinations can all change
 * later without ever invalidating a printed QR. Slugs remain supported as a
 * friendly alias for links shared by hand.
 */
export async function getStoreByScanKey(key: string): Promise<Store | null> {
  const trimmed = (key || "").trim();
  if (!trimmed) return null;

  const byId = await getStoreById(trimmed);
  if (byId) return byId;
  return getStoreBySlug(trimmed);
}

export async function createStore(
  input: Omit<Store, "id" | "createdAt" | "ratingScore" | "reviewCount">
): Promise<Store> {
  const newStore: Store = {
    ...input,
    id: id("store"),
    ratingScore: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("stores").insert([mapStoreToRow(newStore)]);
    if (error) {
      throw new Error(`Failed to create store in Supabase: ${error.message}`);
    }
    return newStore;
  }

  const data = loadLocalData();
  data.stores.push(newStore);
  persistLocalData(data);
  return newStore;
}

export async function updateStore(id: string, updates: Partial<Store>): Promise<Store | null> {
  const existing = await getStoreById(id);
  if (!existing) return null;

  const merged: Store = {
    ...existing,
    ...updates,
    id, // preserve ID
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("stores").update(mapStoreToRow(merged)).eq("id", id);
    if (error) {
      throw new Error(`Failed to update store in Supabase: ${error.message}`);
    }
    return merged;
  }

  const data = loadLocalData();
  const index = data.stores.findIndex((s) => s.id === id);
  if (index === -1) return null;
  data.stores[index] = merged;
  persistLocalData(data);
  return merged;
}

export async function deleteStore(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("stores").delete().eq("id", id).select("id");
    if (error) {
      throw new Error(`Failed to delete store from Supabase: ${error.message}`);
    }
    // Related feedbacks and scan events are removed by ON DELETE CASCADE.
    return (data ?? []).length > 0;
  }

  const data = loadLocalData();
  const initialLen = data.stores.length;
  data.stores = data.stores.filter((s) => s.id !== id);
  if (data.stores.length === initialLen) {
    return false;
  }

  data.feedbacks = data.feedbacks.filter((f) => f.storeId !== id);
  data.events = data.events.filter((e) => e.storeId !== id);
  persistLocalData(data);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Team members (super admin → store admin hierarchy)                         */
/* -------------------------------------------------------------------------- */

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      throw new Error(`Failed to load team members from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToMember);
  }

  return [...loadLocalData().members];
}

export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("email", normalized)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load team member from Supabase: ${error.message}`);
    }
    return data ? mapRowToMember(data) : null;
  }

  const found = loadLocalData().members.find((m) => m.email === normalized);
  return found ? { ...found } : null;
}

export async function createTeamMember(
  input: Omit<TeamMember, "id" | "createdAt" | "status"> & { status?: TeamMember["status"] }
): Promise<TeamMember> {
  const member: TeamMember = {
    ...input,
    email: input.email.toLowerCase().trim(),
    status: input.status || "active",
    id: id("member"),
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("team_members").insert([mapMemberToRow(member)]);
    if (error) {
      throw new Error(`Failed to create team member in Supabase: ${error.message}`);
    }
    return member;
  }

  const data = loadLocalData();
  data.members.push(member);
  persistLocalData(data);
  return member;
}

export async function updateTeamMember(
  memberId: string,
  updates: Partial<Omit<TeamMember, "id" | "createdAt">>
): Promise<TeamMember | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("id", memberId)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load team member from Supabase: ${error.message}`);
    }
    if (!data) return null;

    const merged: TeamMember = {
      ...mapRowToMember(data),
      ...updates,
      id: memberId,
      email: (updates.email || mapRowToMember(data).email).toLowerCase().trim(),
    };
    const { error: updateError } = await supabase
      .from("team_members")
      .update(mapMemberToRow(merged))
      .eq("id", memberId);
    if (updateError) {
      throw new Error(`Failed to update team member in Supabase: ${updateError.message}`);
    }
    return merged;
  }

  const data = loadLocalData();
  const index = data.members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  data.members[index] = {
    ...data.members[index],
    ...updates,
    id: memberId,
    email: (updates.email || data.members[index].email).toLowerCase().trim(),
  };
  persistLocalData(data);
  return data.members[index];
}

export async function deleteTeamMember(memberId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .select("id");
    if (error) {
      throw new Error(`Failed to delete team member from Supabase: ${error.message}`);
    }
    return (data ?? []).length > 0;
  }

  const data = loadLocalData();
  const initialLen = data.members.length;
  data.members = data.members.filter((m) => m.id !== memberId);
  if (data.members.length === initialLen) return false;
  persistLocalData(data);
  return true;
}

// Best-effort review counter update for a confirmed Google hand-off.
async function incrementSupabaseReviewCount(storeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data, error } = await supabase
    .from("stores")
    .select("review_count")
    .eq("id", storeId)
    .maybeSingle();
  if (error || !data) return;

  await supabase
    .from("stores")
    .update({ review_count: (data.review_count ?? 0) + 1 })
    .eq("id", storeId);
}

export async function logScanEvent(event: Omit<ScanEvent, "id" | "timestamp">): Promise<ScanEvent> {
  const newEvent: ScanEvent = {
    ...event,
    id: id("ev"),
    timestamp: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("scan_events").insert([
      {
        id: newEvent.id,
        store_id: newEvent.storeId,
        type: newEvent.type,
        rating: newEvent.rating,
        chips: newEvent.chips,
        review_text: newEvent.reviewText ?? null,
        user_agent: newEvent.userAgent ?? null,
        timestamp: newEvent.timestamp,
      },
    ]);

    // Telemetry is best-effort: never block (or fail) the diner's review flow.
    if (error) {
      console.error("Failed to persist scan event in Supabase:", error.message);
      return newEvent;
    }

    if (event.type === "copy_open") {
      await incrementSupabaseReviewCount(event.storeId);
    }
    return newEvent;
  }

  const data = loadLocalData();
  data.events.push(newEvent);

  if (event.type === "copy_open") {
    const store = data.stores.find((s) => s.id === event.storeId);
    if (store) {
      store.reviewCount += 1;
    }
  }

  persistLocalData(data);
  return newEvent;
}

export async function getScanEvents(storeId?: string, storeIds?: string[]): Promise<ScanEvent[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    if (storeIds && storeIds.length === 0 && !storeId) return [];
    let query = supabase.from("scan_events").select("*").order("timestamp", { ascending: true });
    if (storeId) {
      query = query.eq("store_id", storeId);
    } else if (storeIds && storeIds.length > 0) {
      query = query.in("store_id", storeIds);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load scan events from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToEvent);
  }

  const events = loadLocalData().events;
  if (storeId) return events.filter((e) => e.storeId === storeId);
  if (storeIds) {
    const allowed = new Set(storeIds);
    return events.filter((e) => allowed.has(e.storeId));
  }
  return [...events];
}

export async function submitPrivateFeedback(
  feedback: Omit<FeedbackSubmission, "id" | "status" | "createdAt">
): Promise<FeedbackSubmission> {
  const newFeedback: FeedbackSubmission = {
    ...feedback,
    id: id("fb"),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("feedbacks").insert([
      {
        id: newFeedback.id,
        store_id: newFeedback.storeId,
        store_name: newFeedback.storeName,
        rating: newFeedback.rating,
        table_number: newFeedback.tableNumber ?? null,
        customer_name: newFeedback.customerName ?? null,
        customer_contact: newFeedback.customerContact ?? null,
        message: newFeedback.message,
        status: newFeedback.status,
        alert: newFeedback.alert ?? null,
        created_at: newFeedback.createdAt,
      },
    ]);
    if (error) {
      // The diner must know if their complaint was not delivered.
      throw new Error(`Failed to save feedback in Supabase: ${error.message}`);
    }
    return newFeedback;
  }

  const data = loadLocalData();
  data.feedbacks.unshift(newFeedback);
  persistLocalData(data);
  return newFeedback;
}

/** Records whether the owner alert email actually went out (shown in the inbox). */
export async function updateFeedbackAlert(feedbackId: string, alert: AlertDelivery): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("feedbacks").update({ alert }).eq("id", feedbackId);
    if (error) {
      console.error("Failed to record alert delivery in Supabase:", error.message);
    }
    return;
  }

  const data = loadLocalData();
  const item = data.feedbacks.find((f) => f.id === feedbackId);
  if (!item) return;
  item.alert = alert;
  persistLocalData(data);
}

export async function getFeedbacks(storeId?: string, storeIds?: string[]): Promise<FeedbackSubmission[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    if (storeIds && storeIds.length === 0 && !storeId) return [];
    let query = supabase.from("feedbacks").select("*").order("created_at", { ascending: false });
    if (storeId) {
      query = query.eq("store_id", storeId);
    } else if (storeIds && storeIds.length > 0) {
      query = query.in("store_id", storeIds);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load feedbacks from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToFeedback);
  }

  const feedbacks = loadLocalData().feedbacks;
  if (storeId) return feedbacks.filter((f) => f.storeId === storeId);
  if (storeIds) {
    const allowed = new Set(storeIds);
    return feedbacks.filter((f) => allowed.has(f.storeId));
  }
  return [...feedbacks];
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackSubmission["status"]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("feedbacks")
      .update({ status })
      .eq("id", id)
      .select("id");
    if (error) {
      throw new Error(`Failed to update feedback in Supabase: ${error.message}`);
    }
    return (data ?? []).length > 0;
  }

  const data = loadLocalData();
  const item = data.feedbacks.find((f) => f.id === id);
  if (!item) return false;
  item.status = status;
  persistLocalData(data);
  return true;
}

/**
 * Builds the analytics summary from real recorded events and feedbacks.
 * Exposed separately so it can be unit tested without any data source.
 */
export function buildAnalytics(
  events: ScanEvent[],
  feedbacks: FeedbackSubmission[]
): AnalyticsSummary {
  const totalScans = events.filter((e) => e.type === "scan").length;
  const chipToggles = events.filter((e) => e.type === "chip_toggle").length;
  const positiveRedirections = events.filter((e) => e.type === "copy_open").length;
  const firewallIntercepts = events.filter((e) => e.type === "firewall_intercept").length;

  const redirectionRate =
    totalScans > 0 ? Math.min(100, Math.round((positiveRedirections / totalScans) * 100)) : 0;

  // Diner satisfaction is measured on terminal actions: a Google hand-off (4-5 stars)
  // or a firewall intercept (1-3 stars).
  const ratings = events
    .filter((e) => e.type === "copy_open" || e.type === "firewall_intercept")
    .map((e) => e.rating)
    .filter((r) => r >= 1 && r <= 5);
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
      : 0;

  // Count dish / feature mentions across events
  const chipCounts: Record<string, number> = {};
  events.forEach((ev) => {
    if (ev.chips && ev.chips.length > 0) {
      const uniqueChips = Array.from(new Set(ev.chips));
      uniqueChips.forEach((chip) => {
        chipCounts[chip] = (chipCounts[chip] || 0) + 1;
      });
    }
  });
  const topChips = Object.entries(chipCounts)
    .map(([chip, count]) => ({ chip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const reviewsWithChips = events.filter((e) => e.type === "copy_open" && e.chips && e.chips.length > 0);
  const totalChipsSelected = reviewsWithChips.reduce((sum, e) => sum + e.chips.length, 0);
  const avgChipsPerReview =
    reviewsWithChips.length > 0
      ? Math.round((totalChipsSelected / reviewsWithChips.length) * 10) / 10
      : 0;

  const dailyActivity: AnalyticsSummary["dailyActivity"] = [];
  const buckets = new Map<string, AnalyticsSummary["dailyActivity"][number]>();
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const bucket = {
      date: day.toLocaleDateString("en-US", { weekday: "short" }),
      scans: 0,
      reviews: 0,
      intercepts: 0,
    };
    buckets.set(day.toDateString(), bucket);
    dailyActivity.push(bucket);
  }

  events.forEach((ev) => {
    const ts = new Date(ev.timestamp);
    if (Number.isNaN(ts.getTime())) return;
    const bucket = buckets.get(ts.toDateString());
    if (!bucket) return;
    if (ev.type === "scan") bucket.scans += 1;
    if (ev.type === "copy_open") bucket.reviews += 1;
    if (ev.type === "firewall_intercept") bucket.intercepts += 1;
  });

  const recentEvents = events
    .slice(-15)
    .reverse()
    .map((e) => ({
      id: e.id,
      storeId: e.storeId,
      type: e.type,
      rating: e.rating,
      chips: e.chips,
      reviewText: e.reviewText,
      timestamp: e.timestamp,
    }));

  return {
    totalScans,
    chipToggles,
    positiveRedirections,
    firewallIntercepts,
    complaints: feedbacks.length,
    redirectionRate,
    averageRating,
    avgChipsPerReview,
    topChips,
    recentFeedbacks: feedbacks.slice(0, 10),
    dailyActivity,
    recentEvents,
  };
}

export async function getAnalytics(storeId?: string, storeIds?: string[]): Promise<AnalyticsSummary> {
  const [events, feedbacks] = await Promise.all([
    getScanEvents(storeId, storeIds),
    getFeedbacks(storeId, storeIds),
  ]);
  return buildAnalytics(events, feedbacks);
}

export const SCAN_EVENT_TYPES: ScanEventType[] = [
  "scan",
  "chip_toggle",
  "rating_change",
  "firewall_intercept",
  "copy_open",
  "feedback_submit",
];
