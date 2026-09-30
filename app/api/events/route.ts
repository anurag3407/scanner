import { NextResponse } from "next/server";
import { logScanEvent } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, type, rating, chips, reviewText } = body;

    if (!storeId || !type) {
      return NextResponse.json({ error: "storeId and type are required" }, { status: 400 });
    }

    const event = await logScanEvent({
      storeId,
      type,
      rating: Number(rating) || 5,
      chips: Array.isArray(chips) ? chips : [],
      reviewText: reviewText || undefined,
    });

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("Failed to log scan event", err);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
