import { NextResponse } from "next/server";
import {
  countMenuItems,
  createMenuItem,
  getMenuItems,
  getMenuVersion,
  reorderMenuItems,
} from "@/lib/menu";
import { assertStoreAccess } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { MENU_LIMITS, sanitizeMenuItemInput } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET: the full menu (including sold-out items) for the owner console. */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const auth = await assertStoreAccess(id);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const items = await getMenuItems(id);
    return NextResponse.json({ items, version: await getMenuVersion(id, items) });
  } catch (err) {
    console.error("Failed to load menu", err);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}

/** POST: add one item. Enforces the per-store cap so a runaway client cannot bloat the menu. */
export async function POST(req: Request, context: RouteContext) {
  // Cookie-authenticated mutation: reject cross-site callers outright.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const auth = await assertStoreAccess(id);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sanitizeMenuItemInput(body, "create");
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const count = await countMenuItems(id);
    if (count >= MENU_LIMITS.MAX_ITEMS) {
      return NextResponse.json(
        { error: `Menu is limited to ${MENU_LIMITS.MAX_ITEMS} items per location` },
        { status: 409 }
      );
    }

    const item = await createMenuItem({
      storeId: id,
      name: parsed.value.name as string,
      description: (parsed.value.description as string) || "",
      price: (parsed.value.price as number) ?? 0,
      category: (parsed.value.category as string) || "Others",
      isVeg: (parsed.value.isVeg as boolean) || false,
      isAvailable: (parsed.value.isAvailable as boolean) ?? true,
      imageUrl: parsed.value.imageUrl as string | undefined,
      // New items land at the bottom of their section by default.
      sortOrder: (parsed.value.sortOrder as number) ?? count,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Failed to create menu item", err);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}

/** PUT: persist a full display order. Body: { itemIds: string[] } — every id must belong to this store. */
export async function PUT(req: Request, context: RouteContext) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const auth = await assertStoreAccess(id);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 128)
      : [];
    if (itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds must be a non-empty array of menu item ids" }, { status: 400 });
    }

    const ok = await reorderMenuItems(id, itemIds);
    if (!ok) {
      return NextResponse.json(
        { error: "Reorder rejected: ids must be unique and belong to this location" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to reorder menu", err);
    return NextResponse.json({ error: "Failed to reorder menu" }, { status: 500 });
  }
}
