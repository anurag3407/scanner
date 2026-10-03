import { NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/menu";
import { getStoreByScanKey, toPublicStore } from "@/lib/store";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ key: string }>;
}

/**
 * Public, unauthenticated menu feed for the diner scan page.
 *
 * The QR encodes the permanent store id (or the friendly slug) — the same key
 * the review flow already resolves. Only the public menu projection is ever
 * returned here; owner inboxes, phone numbers and counters stay server-side.
 *
 * Diners poll this every few seconds, so it is rate limited and served with
 * no-store: a stale intermediate cache would break the "owner edits go live"
 * promise, and an unbounded response would make it an easy amplification
 * target. Item counts are capped at the same MAX_ITEMS the write path enforces.
 */
export async function GET(req: Request, context: RouteContext) {
  const limiter = rateLimit(`public-menu:${clientIdentifier(req)}`, 120, 60_000);
  if (limiter.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  try {
    const { key } = await context.params;
    if (!key || key.length > 200) {
      return NextResponse.json({ error: "Invalid menu key" }, { status: 400 });
    }

    const store = await getStoreByScanKey(key);
    if (!store) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { items, version } = await getPublicMenu(store.id);

    return NextResponse.json(
      {
        storeId: store.id,
        version,
        // Reserved for future branding without a second request; only public
        // fields may cross this boundary.
        store: { name: toPublicStore(store).name },
        items,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Failed to load public menu", err);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}
