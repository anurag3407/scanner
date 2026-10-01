import { NextResponse } from "next/server";
import { createTeamMember, getTeamMemberByEmail, getTeamMembers, getStoresByIds } from "@/lib/store";
import { UserRole } from "@/lib/types";
import { isValidEmail, sanitizeStringArray } from "@/lib/validation";
import { assertSuperAdmin, getSuperAdminEmail } from "@/lib/auth";

const VALID_ROLES: UserRole[] = ["super_admin", "store_admin"];

/** Keeps only store ids that actually exist, so assignments can never dangle. */
async function filterExistingStoreIds(storeIds: string[]): Promise<string[]> {
  if (storeIds.length === 0) return [];
  const stores = await getStoresByIds(storeIds);
  return stores.map((s) => s.id);
}

export async function GET() {
  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const members = await getTeamMembers();
    return NextResponse.json({ members });
  } catch (err) {
    console.error("Failed to load team members", err);
    return NextResponse.json({ error: "Failed to load team members" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (email === getSuperAdminEmail()) {
    return NextResponse.json(
      { error: "This email already owns the platform account" },
      { status: 409 }
    );
  }

  const role = VALID_ROLES.includes(body.role as UserRole) ? (body.role as UserRole) : "store_admin";

  try {
    const existing = await getTeamMemberByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: `${email} is already a team member` },
        { status: 409 }
      );
    }

    const storeIds = await filterExistingStoreIds(sanitizeStringArray(body.storeIds, 100));

    const member = await createTeamMember({
      email,
      name: typeof body.name === "string" ? body.name.trim().slice(0, 120) : "",
      role,
      storeIds,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    console.error("Failed to create team member", err);
    return NextResponse.json({ error: "Failed to create team member" }, { status: 500 });
  }
}
