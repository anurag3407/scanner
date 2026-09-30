import { NextResponse } from "next/server";
import { generateSmartReview } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeName, category, chips, rating, variationSeed, tone } = body;

    if (!storeName) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    const result = await generateSmartReview({
      storeName,
      category: category || "Restaurant",
      chips: Array.isArray(chips) ? chips : [],
      rating: Number(rating) || 5,
      variationSeed: Number(variationSeed) || 0,
      tone: tone === "punchy" || tone === "foodie" || tone === "hospitality" ? tone : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to generate review", err);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
