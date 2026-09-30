import { NextResponse } from "next/server";
import { getAllStores, createStore } from "@/lib/store";

export async function GET() {
  try {
    const stores = await getAllStores();
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("Failed to fetch stores", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const store = await createStore({
      name: body.name,
      slug: body.slug.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
      tagline: body.tagline || "Fresh Dining Experience",
      category: body.category || "Restaurant",
      googlePlaceId: body.googlePlaceId || "ChIJN1t_tDeuEmsRUsoyG83frY4",
      brandColor: body.brandColor || "#E11D48",
      accentColor: body.accentColor,
      chips: Array.isArray(body.chips) ? body.chips : ["Great Food", "Friendly Staff", "Nice Ambience"],
      seoKeywords: Array.isArray(body.seoKeywords) ? body.seoKeywords : [],
      managerEmail: body.managerEmail || "manager@example.com",
      managerPhone: body.managerPhone || "+1 (555) 000-0000",
      address: body.address || "",
      tableCount: Number(body.tableCount) || 10,
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error("Failed to create store", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
