import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/store";
import { assertAdminAuth, hasStoreAccess, scopedStoreIds } from "@/lib/auth";

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
      const analytics = await getAnalytics(storeId);
      return NextResponse.json({ analytics });
    }

    const scope = scopedStoreIds(auth.user);
    const analytics = scope === null ? await getAnalytics() : await getAnalytics(undefined, scope);
    return NextResponse.json({ analytics });
  } catch (err) {
    console.error("Failed to load analytics", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
