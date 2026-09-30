import { NextResponse } from "next/server";
import { getFeedbacks, getStoreById, submitPrivateFeedback, updateFeedbackStatus } from "@/lib/store";
import { FeedbackSubmission } from "@/lib/types";
import { parseRating } from "@/lib/validation";

const VALID_STATUSES: FeedbackSubmission["status"][] = ["new", "reviewed", "resolved"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const feedbacks = await getFeedbacks(storeId);
    return NextResponse.json({ feedbacks });
  } catch (err) {
    console.error("Failed to get feedbacks", err);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storeId = typeof body.storeId === "string" ? body.storeId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const rating = parseRating(body.rating);

  if (!storeId || !message) {
    return NextResponse.json({ error: "storeId and message are required" }, { status: 400 });
  }
  if (rating === null) {
    return NextResponse.json({ error: "A rating between 1 and 5 is required" }, { status: 400 });
  }

  try {
    const store = await getStoreById(storeId);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const feedback = await submitPrivateFeedback({
      storeId,
      // Always attribute the complaint to the real store, never to client input.
      storeName: store.name,
      rating,
      tableNumber: typeof body.tableNumber === "string" ? body.tableNumber.trim() : undefined,
      customerName: typeof body.customerName === "string" ? body.customerName.trim() : undefined,
      customerContact:
        typeof body.customerContact === "string" ? body.customerContact.trim() : undefined,
      message: message.slice(0, 2000),
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err) {
    console.error("Failed to submit feedback", err);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status as FeedbackSubmission["status"];

  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `id and status (${VALID_STATUSES.join(", ")}) are required` },
      { status: 400 }
    );
  }

  try {
    const updated = await updateFeedbackStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update feedback status", err);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
