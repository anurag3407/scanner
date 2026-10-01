import { NextResponse } from "next/server";
import { getStoreById, getStoreBySlug, updateStore, deleteStore } from "@/lib/store";
import { Store } from "@/lib/types";
import { slugify, isValidHexColor, sanitizeStringArray, sanitizeTemplateSet } from "@/lib/validation";
import { assertStoreAccess, assertSuperAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const auth = await assertStoreAccess(id);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const store = await getStoreById(id);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ store });
  } catch (err) {
    console.error("Failed to get store", err);
    return NextResponse.json({ error: "Failed to load store" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const existing = await getStoreById(id);
    if (!existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Only these fields can be changed from the client. ID, timestamps and
    // telemetry counters are owned by the server.
    const updates: Partial<Store> = {};

    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.slug === "string") {
      const slug = slugify(body.slug);
      if (!slug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      if (slug !== existing.slug) {
        const clash = await getStoreBySlug(slug);
        if (clash && clash.id !== id) {
          return NextResponse.json(
            { error: `The slug "${slug}" is already in use by another location` },
            { status: 409 }
          );
        }
      }
      updates.slug = slug;
    }
    if (typeof body.googlePlaceId === "string") {
      const placeId = body.googlePlaceId.trim();
      if (!placeId) {
        return NextResponse.json(
          { error: "A Google Place ID is required so reviews are posted to the correct business" },
          { status: 400 }
        );
      }
      updates.googlePlaceId = placeId;
    }
    if (typeof body.tagline === "string") updates.tagline = body.tagline.trim();
    if (typeof body.category === "string" && body.category.trim()) updates.category = body.category.trim();
    if (typeof body.brandColor === "string" && isValidHexColor(body.brandColor)) {
      updates.brandColor = body.brandColor;
    }
    if (typeof body.accentColor === "string" && isValidHexColor(body.accentColor)) {
      updates.accentColor = body.accentColor;
    }
    if (typeof body.logoUrl === "string") updates.logoUrl = body.logoUrl.trim() || undefined;
    if (Array.isArray(body.chips)) updates.chips = sanitizeStringArray(body.chips);
    if (Array.isArray(body.seoKeywords)) updates.seoKeywords = sanitizeStringArray(body.seoKeywords);
    if (typeof body.managerEmail === "string") updates.managerEmail = body.managerEmail.trim();
    if (typeof body.managerPhone === "string") updates.managerPhone = body.managerPhone.trim();
    if (typeof body.address === "string") updates.address = body.address.trim();

    // Sentence combinations may be replaced from the Review Studio. An empty
    // set clears the store override and falls back to the built-in library.
    if (body.reviewTemplates !== undefined) {
      updates.reviewTemplates = sanitizeTemplateSet(body.reviewTemplates);
    }

    const tableCount = Number(body.tableCount);
    if (Number.isFinite(tableCount) && tableCount > 0) updates.tableCount = Math.floor(tableCount);

    const updated = await updateStore(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ store: updated });
  } catch (err) {
    console.error("Failed to update store", err);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Deleting a location is platform-owner only.
  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { id } = await context.params;
    const store = await getStoreById(id);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const deleted = await deleteStore(id);
    if (!deleted) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete store", err);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
