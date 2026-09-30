import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/store";

export async function GET(req: Request) {
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
