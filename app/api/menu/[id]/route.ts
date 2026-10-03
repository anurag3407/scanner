import { NextResponse } from "next/server";
import { deleteMenuItem, getMenuItemById, updateMenuItem } from "@/lib/menu";
import { MenuItem } from "@/lib/types";
import { assertStoreAccess } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { sanitizeMenuItemInput } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Item-level mutations authorize through the ITEM'S store, not a client-supplied
 * store id. A store admin (or a forged request) can therefore only ever touch
 * items that belong to a location they are assigned to — knowing another
 * restaurant's menu item id grants nothing (IDOR).
 */
type ItemAuthorization =
  | { ok: false; status: number; message: string }
  | { ok: true; item: MenuItem };

async function authorizeItem(_req: Request, context: RouteContext): Promise<ItemAuthorization> {
  const { id } = await context.params;

  const item = await getMenuItemById(id);
  if (!item) {
    return { ok: false, status: 404, message: "Menu item not found" };
  }

  const auth = await assertStoreAccess(item.storeId);
  if (!auth.authorized) {
    return { ok: false, status: auth.status || 401, message: auth.error || "Unauthorized" };
  }

  return { ok: true, item };
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const result = await authorizeItem(_req, context);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    return NextResponse.json({ item: result.item });
  } catch (err) {
    console.error("Failed to load menu item", err);
    return NextResponse.json({ error: "Failed to load menu item" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  // Cookie-authenticated mutation: reject cross-site callers outright.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  try {
    const result = await authorizeItem(req, context);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sanitizeMenuItemInput(body, "update");
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const updated = await updateMenuItem(result.item.id, parsed.value);
    if (!updated) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("Failed to update menu item", err);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  try {
    const result = await authorizeItem(req, context);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    const deleted = await deleteMenuItem(result.item.id);
    if (!deleted) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete menu item", err);
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}
