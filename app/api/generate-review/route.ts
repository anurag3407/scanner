import { NextResponse } from "next/server";
import { generateSmartReview } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeName, category, chips, rating, variationSeed, tone } = body;

    const safeStoreName = typeof storeName === "string" ? storeName.trim().slice(0, 200) : "";
    if (!safeStoreName) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    const safeCategory = typeof category === "string" ? category.trim().slice(0, 100) : "Restaurant";
    const safeChips = Array.isArray(chips)
      ? chips
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.trim().slice(0, 100))
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const result = await generateSmartReview({
      storeName: safeStoreName,
      category: safeCategory || "Restaurant",
      chips: safeChips,
      rating: Number(rating) || 5,
      variationSeed: Math.abs(Number(variationSeed) || 0) % 100000,
      tone: tone === "punchy" || tone === "foodie" || tone === "hospitality" ? tone : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to generate review", err);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
