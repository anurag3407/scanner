import { NextResponse } from "next/server";
import {
  getFeedbacks,
  getStoreById,
  getFeedbackById,
  submitPrivateFeedback,
  updateFeedbackStatus,
  updateFeedbackAlert,
} from "@/lib/store";
import { AlertDelivery, FeedbackSubmission } from "@/lib/types";
import { parseRating, sanitizeEmailList } from "@/lib/validation";
import { sendLowRatingAlertEmail } from "@/lib/email";
import { assertAdminAuth, hasStoreAccess, scopedStoreIds } from "@/lib/auth";

const VALID_STATUSES: FeedbackSubmission["status"][] = ["new", "reviewed", "resolved"];

export async function GET(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;

    if (storeId) {
      if (!hasStoreAccess(auth.user, storeId)) {
        return NextResponse.json({ error: "You do not have access to this location." }, { status: 403 });
      }
      const feedbacks = await getFeedbacks(storeId);
      return NextResponse.json({ feedbacks });
    }

    const scope = scopedStoreIds(auth.user);
    if (scope !== null && scope.length === 0) {
      return NextResponse.json({ feedbacks: [] });
    }
    const feedbacks = scope === null ? await getFeedbacks() : await getFeedbacks(undefined, scope);
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

    const tableNumber = typeof body.tableNumber === "string" ? body.tableNumber.trim().slice(0, 50) : undefined;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim().slice(0, 100) : undefined;
    const customerContact = typeof body.customerContact === "string" ? body.customerContact.trim().slice(0, 150) : undefined;
    const safeMessage = message.slice(0, 2000);

    const feedback = await submitPrivateFeedback({
      storeId,
      // Always attribute the complaint to the real store, never to client input.
      storeName: store.name,
      rating,
      tableNumber,
      customerName,
      customerContact,
      message: safeMessage,
    });

    // Low-rating alerts go to the store's own owners — never to the platform
    // fallback inbox. Delivery success/failure is recorded on the feedback so
    // the console can show whether the owners were actually reached.
    if (rating <= 3) {
      const owners = sanitizeEmailList(store.managerEmail);
      let alert: AlertDelivery;

      if (owners.length === 0) {
        console.warn(`Store "${store.name}" has no owner email configured. Alert skipped.`);
        alert = {
          status: "skipped",
          recipients: [],
          error: "No owner email configured for this location",
        };
      } else {
        const result = await sendLowRatingAlertEmail({
          toEmails: owners,
          storeName: store.name,
          rating,
          tableNumber,
          customerName,
          customerContact,
          message: safeMessage,
        });
        alert = result.success
          ? { status: "sent", recipients: owners, sentAt: new Date().toISOString() }
          : { status: "failed", recipients: owners, error: result.error || "Unknown email error" };
        if (!result.success) {
          console.error("Failed to dispatch Resend email alert:", result.error);
        }
      }

      await updateFeedbackAlert(feedback.id, alert);
      feedback.alert = alert;
    }

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err) {
    console.error("Failed to submit feedback", err);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

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
    const existing = await getFeedbackById(id);
    if (!existing) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }
    if (!hasStoreAccess(auth.user, existing.storeId)) {
      return NextResponse.json({ error: "You do not have access to this location." }, { status: 403 });
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
