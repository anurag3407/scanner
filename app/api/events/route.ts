import { NextResponse } from "next/server";
import { getStoreById, logScanEvent, SCAN_EVENT_TYPES } from "@/lib/store";
import { sanitizeStringArray } from "@/lib/validation";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storeId = typeof body.storeId === "string" ? body.storeId : "";
  const type = body.type;

  if (!storeId || typeof type !== "string" || !SCAN_EVENT_TYPES.includes(type as never)) {
    return NextResponse.json(
      { error: `storeId and a valid type (${SCAN_EVENT_TYPES.join(", ")}) are required` },
      { status: 400 }
    );
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "A rating between 1 and 5 is required" }, { status: 400 });
  }

  try {
    const store = await getStoreById(storeId);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const event = await logScanEvent({
      storeId,
      type: type as (typeof SCAN_EVENT_TYPES)[number],
      rating,
      chips: sanitizeStringArray(body.chips),
      reviewText: typeof body.reviewText === "string" ? body.reviewText.slice(0, 4000) : undefined,
    });

    return NextResponse.json({ success: true, event });
  } catch (err) {
    console.error("Failed to log scan event", err);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
