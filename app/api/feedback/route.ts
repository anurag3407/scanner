import { NextResponse } from "next/server";
import { getFeedbacks, submitPrivateFeedback, updateFeedbackStatus } from "@/lib/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const feedbacks = await getFeedbacks(storeId);
    return NextResponse.json({ feedbacks });
  } catch (err) {
    console.error("Failed to get feedbacks", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, storeName, rating, tableNumber, customerName, customerContact, message } = body;

    if (!storeId || !message) {
      return NextResponse.json({ error: "storeId and message are required" }, { status: 400 });
    }

    const feedback = await submitPrivateFeedback({
      storeId,
      storeName: storeName || "Restaurant Guest",
      rating: Number(rating) || 2,
      tableNumber: tableNumber || "",
      customerName: customerName || "Anonymous Diner",
      customerContact: customerContact || "",
      message,
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err) {
    console.error("Failed to submit feedback", err);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

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
