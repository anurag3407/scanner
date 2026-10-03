import fs from "fs";
import path from "path";
import { MenuItem, PublicMenuItem } from "./types";
import { getSupabaseClient } from "./supabase";
import { MENU_LIMITS, sanitizeImageUrl } from "./validation";

/**
 * Data layer for the live digital menu.
 *
 * Production stores menu rows in Supabase (`menu_items`). Like lib/store.ts,
 * a local JSON file is used when Supabase is not configured (local dev, tests).
 * It is a SEPARATE file from the store data file on purpose: lib/store.ts
 * persists only the four keys it knows about, so sharing the file would let
 * any store write silently delete every menu item.
 */
interface MenuDataSchema {
  items: MenuItem[];
}

let memoryCache: MenuDataSchema | null = null;
let memoryCacheFile: string | null = null;

/** Test seam: drops the in-memory cache so tests always read from disk. */
export function invalidateMenuCache(): void {
  memoryCache = null;
  memoryCacheFile = null;
}

function getMenuDataFile(): string {
  return process.env.MENU_DATA_FILE || path.join(process.cwd(), ".data", "menu-data.json");
}

function loadLocalMenu(): MenuDataSchema {
  if (memoryCache && memoryCacheFile === getMenuDataFile()) {
    return memoryCache;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ getMenuDataFile(), "utf-8"));
    memoryCache = { items: Array.isArray(parsed?.items) ? parsed.items : [] };
    memoryCacheFile = getMenuDataFile();
    return memoryCache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error(`Failed to read local menu data file at ${getMenuDataFile()}`, err);
    }
  }

  memoryCache = { items: [] };
  memoryCacheFile = getMenuDataFile();
  return memoryCache;
}

function persistLocalMenu(data: MenuDataSchema) {
  try {
    const file = getMenuDataFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(
      "Failed to persist local menu data. In serverless environments (Cloudflare Workers) configure Supabase so data is stored persistently.",
      err
    );
  }
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToMenuItem(r: any): MenuItem {
  return {
    id: r.id,
    storeId: r.store_id || r.storeId,
    name: r.name || "",
    description: r.description || "",
    price: Number(r.price) || 0,
    category: r.category || "Others",
    isVeg: r.is_veg ?? r.isVeg ?? false,
    isAvailable: r.is_available ?? r.isAvailable ?? true,
    imageUrl: typeof (r.image_url ?? r.imageUrl) === "string" && (r.image_url ?? r.imageUrl) ? r.image_url ?? r.imageUrl : undefined,
    sortOrder: Number(r.sort_order ?? r.sortOrder) || 0,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || r.created_at || r.createdAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMenuItemToRow(i: MenuItem): any {
  return {
    id: i.id,
    store_id: i.storeId,
    name: i.name,
    description: i.description || "",
    price: i.price,
    category: i.category || "Others",
    is_veg: i.isVeg,
    is_available: i.isAvailable,
    image_url: i.imageUrl || null,
    sort_order: i.sortOrder,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  };
}

/** Forces a stored record into the declared shape — storage columns are JSON-free but a fallback file may hold anything. */
function normalizeMenuItem(raw: unknown): MenuItem | null {
  const r = (raw || {}) as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const storeId = String(r.storeId ?? "");
  if (!name || !storeId) return null;
  const createdAt = r.createdAt ? String(r.createdAt) : new Date().toISOString();
  const item: MenuItem = {
    id: String(r.id ?? ""),
    storeId,
    name: name.slice(0, MENU_LIMITS.MAX_NAME),
    description: typeof r.description === "string" ? r.description.slice(0, MENU_LIMITS.MAX_DESCRIPTION) : "",
    price: Number(r.price) || 0,
    category: typeof r.category === "string" && r.category.trim() ? r.category : "Others",
    isVeg: r.isVeg === true,
    // A corrupted availability flag must never hide items from diners by
    // default — but an explicitly false value is honored.
    isAvailable: r.isAvailable !== false,
    imageUrl: sanitizeImageUrl(r.imageUrl),
    sortOrder: Number.isInteger(r.sortOrder) ? (r.sortOrder as number) : 0,
    createdAt,
    updatedAt: r.updatedAt ? String(r.updatedAt) : createdAt,
  };
  if (!item.id) return null;
  return item;
}

/**
 * All menu items for a store, in display order. Includes unavailable items —
 * the owner console shows the full menu; the diner projection filters instead.
 */
export async function getMenuItems(storeId: string): Promise<MenuItem[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .limit(MENU_LIMITS.MAX_ITEMS);
    if (error) {
      throw new Error(`Failed to load menu items from Supabase: ${error.message}`);
    }
    return (data ?? []).map(mapRowToMenuItem);
  }

  return loadLocalMenu()
    .items.filter((i) => i.storeId === storeId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

/** Strips a MenuItem down to the fields the unauthenticated diner flow may see. */
export function toPublicItem(item: MenuItem): PublicMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    isVeg: item.isVeg,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl,
    sortOrder: item.sortOrder,
  };
}

/** Diner projection: available items only, same cap as the admin read. */
export async function getPublicMenuItems(storeId: string): Promise<PublicMenuItem[]> {
  const items = await getMenuItems(storeId);
  return items.filter((i) => i.isAvailable).map(toPublicItem);
}

/**
 * One round trip for the scan page: the diner projection plus the version
 * stamp the client polls against.
 */
export async function getPublicMenu(
  storeId: string
): Promise<{ items: PublicMenuItem[]; version: string }> {
  const items = await getMenuItems(storeId);
  const version = items.reduce((max, i) => (i.updatedAt > max ? i.updatedAt : max), "");
  return {
    items: items.filter((i) => i.isAvailable).map(toPublicItem),
    version,
  };
}

export async function getMenuItemById(itemId: string): Promise<MenuItem | null> {
  if (!itemId) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", itemId)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load menu item from Supabase: ${error.message}`);
    }
    return data ? mapRowToMenuItem(data) : null;
  }

  const found = loadLocalMenu().items.find((i) => i.id === itemId);
  return found ? { ...found } : null;
}

/**
 * The public polling version for a store: the most recent `updated_at` across
 * its items. Diners poll this value and re-fetch only when it moves.
 */
export async function getMenuVersion(storeId: string, items?: MenuItem[]): Promise<string> {
  const list = items ?? (await getMenuItems(storeId));
  return list.reduce((max, i) => (i.updatedAt > max ? i.updatedAt : max), "");
}

export async function createMenuItem(
  input: Omit<MenuItem, "id" | "createdAt" | "updatedAt">
): Promise<MenuItem> {
  const now = new Date().toISOString();
  const newItem: MenuItem = {
    ...input,
    id: id("menu"),
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("menu_items").insert([mapMenuItemToRow(newItem)]);
    if (error) {
      throw new Error(`Failed to create menu item in Supabase: ${error.message}`);
    }
    return newItem;
  }

  const data = loadLocalMenu();
  data.items.push(newItem);
  persistLocalMenu(data);
  return newItem;
}

/** Number of items a store already has — enforces the per-store menu cap. */
export async function countMenuItems(storeId: string): Promise<number> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { count, error } = await supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if (error) {
      throw new Error(`Failed to count menu items in Supabase: ${error.message}`);
    }
    return count ?? 0;
  }

  return loadLocalMenu().items.filter((i) => i.storeId === storeId).length;
}

export async function updateMenuItem(
  itemId: string,
  updates: Partial<Omit<MenuItem, "id" | "storeId" | "createdAt">>
): Promise<MenuItem | null> {
  const existing = await getMenuItemById(itemId);
  if (!existing) return null;

  const merged: MenuItem = {
    ...existing,
    ...updates,
    id: existing.id,
    storeId: existing.storeId, // ownership can never be reassigned
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("menu_items")
      .update({
        name: merged.name,
        description: merged.description,
        price: merged.price,
        category: merged.category,
        is_veg: merged.isVeg,
        is_available: merged.isAvailable,
        image_url: merged.imageUrl || null,
        sort_order: merged.sortOrder,
        updated_at: merged.updatedAt,
      })
      .eq("id", itemId);
    if (error) {
      throw new Error(`Failed to update menu item in Supabase: ${error.message}`);
    }
    return merged;
  }

  const data = loadLocalMenu();
  const index = data.items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;
  data.items[index] = normalizeMenuItem(merged) ?? merged;
  persistLocalMenu(data);
  return merged;
}

export async function deleteMenuItem(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId)
      .select("id");
    if (error) {
      throw new Error(`Failed to delete menu item from Supabase: ${error.message}`);
    }
    return (data ?? []).length > 0;
  }

  const data = loadLocalMenu();
  const initialLen = data.items.length;
  data.items = data.items.filter((i) => i.id !== itemId);
  if (data.items.length === initialLen) return false;
  persistLocalMenu(data);
  return true;
}

/**
 * Persists a full display order for a store's menu. Accepts only ids that
 * belong to THIS store — a forged id for another store must never be reordered
 * (or, worse, silently claim that store's slot).
 */
export async function reorderMenuItems(storeId: string, orderedIds: string[]): Promise<boolean> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return false;
  if (orderedIds.length > MENU_LIMITS.MAX_ITEMS) return false;
  if (new Set(orderedIds).size !== orderedIds.length) return false;

  const current = await getMenuItems(storeId);
  const storeItemIds = new Set(current.map((i) => i.id));
  // Every provided id must be one of this store's items. Unknown/foreign ids
  // abort the whole reorder rather than being partially applied.
  if (!orderedIds.every((id) => storeItemIds.has(id))) return false;

  const rank = new Map(orderedIds.map((id, idx) => [id, idx]));

  const supabase = getSupabaseClient();
  if (supabase) {
    // Sequential updates, each stamping updated_at so diners pick the change up.
    for (const [itemId, order] of rank) {
      const { error } = await supabase
        .from("menu_items")
        .update({ sort_order: order, updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("store_id", storeId);
      if (error) {
        throw new Error(`Failed to reorder menu items in Supabase: ${error.message}`);
      }
    }
    return true;
  }

  const data = loadLocalMenu();
  const now = new Date().toISOString();
  for (const item of data.items) {
    if (item.storeId === storeId && rank.has(item.id)) {
      item.sortOrder = rank.get(item.id)!;
      item.updatedAt = now;
    }
  }
  persistLocalMenu(data);
  return true;
}
