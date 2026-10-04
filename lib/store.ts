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
  PublicStore,
  Subscription,
  SubscriptionStatus,
  BillingPeriod,
  RevenueSummary,
} from "./types";
import { getSupabaseClient } from "./supabase";
import { sanitizeTemplateSet } from "./validation";

interface DataStoreSchema {
  stores: Store[];
  feedbacks: FeedbackSubmission[];
  events: ScanEvent[];
  members: TeamMember[];
  subscriptions: Subscription[];
}

let memoryCache: DataStoreSchema | null = null;
let memoryCacheFile: string | null = null;

/**
 * Drops the in-memory cache of the JSON fallback file.
 *
 * Exposed for tests that corrupt the file on disk and then assert what the
 * authorization layer reads back. Without this seam such a test silently
 * passes against a stale cached record and proves nothing.
 */
export function invalidateLocalCache(): void {
  memoryCache = null;
  memoryCacheFile = null;
}

/**
 * Upper bound on rows read into memory for the two append-only tables.
 *
 * `/api/events` is an anonymous, publicly writable endpoint, so both tables
 * grow without any human in the loop. Loading every row into the Worker to
 * compute a dashboard is an unbounded-query / memory-exhaustion vector: enough
 * anonymous POSTs would make every console page and `/api/analytics` fail.
 * Analytics are built over a recent window, which is both correct for the
 * 7-day heatmap and bounded.
 */
const MAX_EVENT_ROWS = 5000;
const MAX_FEEDBACK_ROWS = 1000;

function getDataFile(): string {
  return process.env.STORE_DATA_FILE || path.join(process.cwd(), ".data", "store-data.json");
}

function emptyData(): DataStoreSchema {
  return { stores: [], feedbacks: [], events: [], members: [], subscriptions: [] };
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
      subscriptions: Array.isArray(parsed?.subscriptions) ? parsed.subscriptions : [],
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

/** Last `max` entries of an append-ordered array, mirroring the SQL LIMIT. */
function tail<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(items.length - max) : [...items];
}

function parseJsonArray(val: unknown): string[] {
  // Only real strings count. `val.map(String)` used to stringify objects and
  // numbers into ids like "[object Object]" or "42"; a permissive array in a
  // JSON column must never become a scope entry.
  if (Array.isArray(val)) {
    return val.filter((item): item is string => typeof item === "string");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * True for a value shaped like a server-minted store id (`store_<ts>_<rand>`).
 *
 * Store ids are the only thing a membership assignment may contain. Rejecting
 * everything else at the data layer means wildcards, prototype keys and
 * non-strings cannot reach an authorization decision even if a caller forgets
 * to filter.
 */
function isStoreIdShape(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && /^[A-Za-z0-9_-]+$/.test(id);
}

/**
 * Upper bound on a single member's location assignments.
 *
 * Scoped reads expand these ids into a PostgREST `in.(...)` filter, which lands
 * in the request URL. Measured against realistic ids (`store_<ts>_<rand>`,
 * ~25 chars): 100 ids is about 3 KB, 500 about 15 KB, 5 000 about 145 KB — past
 * the 16 KB Cloudflare Worker limit and the 8 KB nginx default, at which point
 * EVERY scoped read for that member fails.
 *
 * The HTTP routes already cap at 100, but the cap belongs here too: this is the
 * layer a future caller, a migration, or a hand-edited row would go through, and
 * the failure mode is total rather than gradual.
 */
const MAX_ASSIGNMENTS = 100;

function normalizeAssignments(val: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of parseJsonArray(val)) {
    if (!isStoreIdShape(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_ASSIGNMENTS) break;
  }
  return out;
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
    signatureKeywords: parseJsonArray(r.signature_keywords || r.signatureKeywords),
    reviewTone: ["foodie", "hospitality"].includes(String(r.review_tone || r.reviewTone))
      ? (String(r.review_tone || r.reviewTone) as Store["reviewTone"])
      : undefined,
    currency: typeof r.currency === "string" && r.currency ? r.currency : undefined,
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
    signature_keywords: s.signatureKeywords || [],
    review_tone: s.reviewTone || "punchy",
    currency: s.currency || "INR",
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

/**
 * Forces a team-member record into the declared shape. Auth decisions in
 * lib/auth.ts depend on `role` and `status`; without this, an out-of-enum
 * value read from storage flows straight into the authorization branch.
 */
function normalizeMember(raw: unknown): TeamMember {
  const r = (raw || {}) as Record<string, unknown>;
  // NOTE: an unrecognized `status` must NOT be coerced to "active". Doing so
  // would silently promote a corrupted or revoked record to full access. Keep
  // it verbatim so lib/auth.ts can fail closed on anything but "active".
  const status: TeamMember["status"] =
    r.status === "active" || r.status === "suspended" ? r.status : "suspended";
  return {
    id: String(r.id ?? ""),
    email: String(r.email ?? "").toLowerCase().trim(),
    name: typeof r.name === "string" ? r.name : "",
    role: r.role === "super_admin" ? "super_admin" : "store_admin",
    // Only well-formed ids survive. A JSON column can hold anything, and a
    // wildcard entry ("*") must never leave the data layer as an assignment —
    // it is the kind of value a future query could read as "all locations".
    storeIds: normalizeAssignments(r.storeIds),
    status,
    createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
  };
}

/** Forces a feedback record into the declared shape. */
function normalizeFeedback(raw: unknown): FeedbackSubmission {
  const r = (raw || {}) as Record<string, unknown>;
  const status: FeedbackSubmission["status"] =
    r.status === "reviewed" || r.status === "resolved" ? r.status : "new";
  return {
    id: String(r.id ?? ""),
    storeId: String(r.storeId ?? ""),
    storeName: typeof r.storeName === "string" ? r.storeName : "",
    rating: Number(r.rating) || 0,
    tableNumber: typeof r.tableNumber === "string" ? r.tableNumber : undefined,
    customerName: typeof r.customerName === "string" ? r.customerName : undefined,
    customerContact: typeof r.customerContact === "string" ? r.customerContact : undefined,
    message: typeof r.message === "string" ? r.message : "",
    status,
    alert: parseJsonObject<AlertDelivery>(r.alert),
    createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
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

/**
 * Strips a Store down to the fields the unauthenticated diner flow is allowed
 * to see. Owner inboxes, owner phone numbers, SEO keywords, revenue counters
 * and creation timestamps are deliberately dropped — they are server-only.
 */
export function toPublicStore(store: Store): PublicStore {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    tagline: store.tagline || "",
    category: store.category || "Restaurant",
    address: store.address || undefined,
    brandColor: store.brandColor || "#E11D48",
    googlePlaceId: store.googlePlaceId || "",
    chips: Array.isArray(store.chips) ? store.chips : [],
    reviewTemplates: store.reviewTemplates,
    reviewTone: store.reviewTone,
    signatureKeywords: Array.isArray(store.signatureKeywords) ? store.signatureKeywords : [],
    currency: store.currency,
  };
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

  // Normalize on read: a local record written by an older code path may hold
  // values outside the enum, and this result feeds authorization directly.
  const found = loadLocalData().members.find(
    (m) => String(m?.email ?? "").toLowerCase().trim() === normalized
  );
  return found ? normalizeMember(found) : null;
}

export async function createTeamMember(
  input: Omit<TeamMember, "id" | "createdAt" | "status"> & { status?: TeamMember["status"] }
): Promise<TeamMember> {
  const member: TeamMember = {
    ...input,
    email: input.email.toLowerCase().trim(),
    // Enforce the assignment cap here, not only at the HTTP routes: the URL
    // length of a scoped read depends on it.
    storeIds: normalizeAssignments(input.storeIds),
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
      // Cap + shape-check assignments on write, so an oversized or malformed
      // scope never reaches storage (and never inflates a scoped read URL).
      storeIds: updates.storeIds ? normalizeAssignments(updates.storeIds) : mapRowToMember(data).storeIds,
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

  // Normalize through the same mapper the Supabase path uses. Spreading
  // `updates` over the raw stored row previously let arbitrary values (an
  // unknown `status`, a bad `role`, a non-array `storeIds`) reach
  // `getTeamMemberByEmail`, which returns local rows un-mapped — and those
  // values then drive authorization decisions in lib/auth.ts.
  const merged = normalizeMember({
    ...data.members[index],
    ...updates,
    id: memberId,
    email: (updates.email || data.members[index].email).toLowerCase().trim(),
    ...(updates.storeIds ? { storeIds: updates.storeIds } : {}),
  });
  data.members[index] = merged;
  persistLocalData(data);
  return merged;
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

    // NOTE: this deliberately does NOT touch stores.reviewCount any more.
    // `copy_open` is an anonymous, publicly-writable event, so incrementing a
    // per-store counter here meant anyone who had scanned the QR could inflate
    // a store's headline number ~7,200/hour from one IP. Copy events are still
    // recorded in scan_events, which is what the analytics funnel reads.
    return newEvent;
  }

  const data = loadLocalData();
  data.events.push(newEvent);

  persistLocalData(data);
  return newEvent;
}

export async function getScanEvents(storeId?: string, storeIds?: string[]): Promise<ScanEvent[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    if (storeIds && storeIds.length === 0 && !storeId) return [];
    // Ordered ascending so the newest events land exactly at the limit — a
    // bounded read that still returns the data the dashboard shows.
    let query = supabase
      .from("scan_events")
      .select("*")
      .order("timestamp", { ascending: true })
      .limit(MAX_EVENT_ROWS);
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
  if (storeId) return tail(events.filter((e) => e.storeId === storeId), MAX_EVENT_ROWS);
  if (storeIds) {
    const allowed = new Set(storeIds);
    return tail(events.filter((e) => allowed.has(e.storeId)), MAX_EVENT_ROWS);
  }
  return tail(events, MAX_EVENT_ROWS);
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
    // Newest first, capped — the inbox only ever renders the most recent slice.
    let query = supabase
      .from("feedbacks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_FEEDBACK_ROWS);
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
  if (storeId) return feedbacks.filter((f) => f.storeId === storeId).slice(0, MAX_FEEDBACK_ROWS);
  if (storeIds) {
    const allowed = new Set(storeIds);
    return feedbacks.filter((f) => allowed.has(f.storeId)).slice(0, MAX_FEEDBACK_ROWS);
  }
  return feedbacks.slice(0, MAX_FEEDBACK_ROWS);
}

export async function getFeedbackById(feedbackId: string): Promise<FeedbackSubmission | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("id", feedbackId)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load feedback from Supabase: ${error.message}`);
    }
    return data ? mapRowToFeedback(data) : null;
  }

  // This result's `storeId` is exactly what the PATCH route authorizes
  // against, so a malformed local row must not be able to carry a bogus
  // owner (or a bogus status) through the check.
  const found = loadLocalData().feedbacks.find((f) => f?.id === feedbackId);
  return found ? normalizeFeedback(found) : null;
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
  "menu_view",
  "chip_toggle",
  "rating_change",
  "firewall_intercept",
  "copy_open",
  "feedback_submit",
];

/* ------------------------------------------------------------------------- */
/* Subscriptions                                                             */
/* ------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSubscription(r: any): Subscription {
  return {
    id: r.id,
    storeId: r.store_id || r.storeId,
    plan: r.plan || "solo",
    status: (r.status || "active") as SubscriptionStatus,
    // Money is an integer count of paise. A non-numeric or negative value from
    // a hand-edited row must not silently become revenue.
    mrrInr: Math.max(0, Math.trunc(Number(r.mrr_inr ?? r.mrrInr) || 0)),
    billingPeriod: (r.billing_period || r.billingPeriod || "monthly") as BillingPeriod,
    gstin: r.gstin || undefined,
    trialStartedAt: r.trial_started_at || r.trialStartedAt || undefined,
    trialMinutes: Number.isFinite(Number(r.trial_minutes ?? r.trialMinutes))
      ? Number(r.trial_minutes ?? r.trialMinutes)
      : undefined,
    currentPeriodEnd: r.current_period_end || r.currentPeriodEnd || undefined,
    startedAt: r.started_at || r.startedAt || new Date().toISOString(),
    endedAt: r.ended_at || r.endedAt || undefined,
    cancelReason: r.cancel_reason || r.cancelReason || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubscriptionToRow(s: Subscription): any {
  return {
    id: s.id,
    store_id: s.storeId,
    plan: s.plan,
    status: s.status,
    mrr_inr: Math.max(0, Math.trunc(Number(s.mrrInr) || 0)),
    billing_period: s.billingPeriod,
    gstin: s.gstin || null,
    trial_started_at: s.trialStartedAt || null,
    trial_minutes: s.trialMinutes ?? null,
    current_period_end: s.currentPeriodEnd || null,
    started_at: s.startedAt,
    ended_at: s.endedAt || null,
    cancel_reason: s.cancelReason || null,
    created_at: s.createdAt,
    updated_at: s.updatedAt || new Date().toISOString(),
  };
}

/**
 * Subscriptions for the given stores.
 *
 * `storeIds` of `null` means "no filter" (super admin), mirroring
 * `scopedStoreIds` in lib/auth.ts — callers pass their scope, so a store admin
 * can never widen their own view by calling this directly.
 */
export async function getSubscriptions(
  storeIds?: string[] | null
): Promise<Subscription[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from("subscriptions").select("*");
    if (Array.isArray(storeIds)) {
      if (storeIds.length === 0) return [];
      query = query.in("store_id", storeIds);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load subscriptions: ${error.message}`);
    return (data || []).map(mapRowToSubscription);
  }

  const data = loadLocalData();
  if (Array.isArray(storeIds)) {
    const allowed = new Set(storeIds);
    return data.subscriptions.filter((s) => allowed.has(s.storeId));
  }
  return data.subscriptions;
}

/** Creates (or replaces) the subscription for a store. One live row per store. */
export async function upsertSubscription(
  input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Subscription> {
  // Look the target row up through the SAME backend as the write. Reading only
  // the local file here meant that with Supabase configured (the production
  // case) `existing` was always undefined, so every save minted a new id and
  // inserted a duplicate subscription instead of updating the store's row.
  const candidates = await getSubscriptions([input.storeId]);
  const existing =
    (input.id ? candidates.find((s) => s.id === input.id) : undefined) ??
    candidates.find((s) => !s.endedAt) ??
    candidates[0] ??
    null;

  const row: Subscription = {
    ...input,
    id: input.id || existing?.id || id("sub"),
    // An ended subscription is churned by definition. Keeping status and
    // ended_at in agreement is what makes the churn figure trustworthy.
    status: input.endedAt ? "churned" : input.status,
    mrrInr: Math.max(0, Math.trunc(Number(input.mrrInr) || 0)),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("subscriptions")
      .upsert(mapSubscriptionToRow(row), { onConflict: "id" });
    if (error) throw new Error(`Failed to save subscription: ${error.message}`);
    return row;
  }

  const data = loadLocalData();
  const index = data.subscriptions.findIndex((s) => s.id === row.id);
  if (index === -1) data.subscriptions.push(row);
  else data.subscriptions[index] = row;
  persistLocalData(data);
  return row;
}

/** Ends a subscription. Churn is recorded, never inferred from a deleted row. */
export async function cancelSubscription(
  storeId: string,
  reason?: string
): Promise<Subscription | null> {
  const existing = (await getSubscriptions([storeId])).find((s) => s.storeId === storeId);
  if (!existing) return null;
  return upsertSubscription({
    ...existing,
    status: "churned",
    endedAt: new Date().toISOString(),
    cancelReason: reason || "cancelled",
  });
}

/**
 * Recurring revenue, computed only from live subscriptions.
 *
 * This is the first place MRR can be derived from data rather than from a
 * hardcoded slider. `payingLocations` counts active and trialling rows, so a
 * trial is visible without being counted as revenue.
 */
export async function getRevenueSummary(
  storeIds?: string[] | null
): Promise<RevenueSummary> {
  const subs = await getSubscriptions(storeIds);

  const live = subs.filter((s) => s.status === "active" || s.status === "trial");
  const byPlan: RevenueSummary["byPlan"] = {};
  let mrrInr = 0;

  for (const s of live) {
    mrrInr += s.mrrInr;
    if (!byPlan[s.plan]) byPlan[s.plan] = { locations: 0, mrrInr: 0 };
    byPlan[s.plan].locations += 1;
    byPlan[s.plan].mrrInr += s.mrrInr;
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const churnedLast30Days = subs.filter(
    (s) => s.status === "churned" && s.endedAt && new Date(s.endedAt).getTime() >= thirtyDaysAgo
  ).length;

  return {
    payingLocations: live.length,
    mrrInr,
    mrrRupees: mrrInr / 100,
    arrInr: mrrInr * 12,
    byPlan,
    churnedLast30Days,
  };
}
