import { NextResponse } from "next/server";
import { getAllStores, createStore, getStoreBySlug } from "@/lib/store";
import { slugify, isValidHexColor, sanitizeStringArray } from "@/lib/validation";
import { assertAdminAuth } from "@/lib/auth";

export async function GET() {
  const auth = await assertAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const stores = await getAllStores();
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("Failed to fetch stores", err);
    return NextResponse.json({ error: "Failed to load stores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? slugify(body.slug) : "";
  const googlePlaceId =
    typeof body.googlePlaceId === "string" ? body.googlePlaceId.trim() : "";

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }
  if (!googlePlaceId) {
    return NextResponse.json(
      { error: "A Google Place ID is required so reviews are posted to the correct business" },
      { status: 400 }
    );
  }

  const brandColor =
    typeof body.brandColor === "string" && isValidHexColor(body.brandColor)
      ? body.brandColor
      : "#E11D48";

  try {
    const existing = await getStoreBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { error: `The slug "${slug}" is already in use by another location` },
        { status: 409 }
      );
    }

    const tableCount = Number(body.tableCount);

    const store = await createStore({
      name,
      slug,
      tagline: typeof body.tagline === "string" ? body.tagline.trim() : "",
      category: typeof body.category === "string" && body.category.trim() ? body.category.trim() : "Restaurant",
      googlePlaceId,
      brandColor,
      accentColor:
        typeof body.accentColor === "string" && isValidHexColor(body.accentColor)
          ? body.accentColor
          : undefined,
      logoUrl: typeof body.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : undefined,
      chips: sanitizeStringArray(body.chips),
      seoKeywords: sanitizeStringArray(body.seoKeywords),
      managerEmail: typeof body.managerEmail === "string" ? body.managerEmail.trim() : "",
      managerPhone: typeof body.managerPhone === "string" ? body.managerPhone.trim() : "",
      address: typeof body.address === "string" ? body.address.trim() : "",
      tableCount: Number.isFinite(tableCount) && tableCount > 0 ? Math.floor(tableCount) : 1,
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error("Failed to create store", err);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}
