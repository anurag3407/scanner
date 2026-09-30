import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/store";
import { assertAdminAuth } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || undefined;
    const analytics = await getAnalytics(storeId);
    return NextResponse.json({ analytics });
  } catch (err) {
    console.error("Failed to load analytics", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
