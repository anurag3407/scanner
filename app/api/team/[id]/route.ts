import { NextResponse } from "next/server";
import { getTeamMembers, getTeamMemberByEmail, getStoresByIds, updateTeamMember, deleteTeamMember } from "@/lib/store";
import { TeamMember, UserRole } from "@/lib/types";
import { isValidEmail, sanitizeStringArray } from "@/lib/validation";
import { assertSuperAdmin, getSuperAdminEmail } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";

const VALID_ROLES: UserRole[] = ["super_admin", "store_admin"];
const VALID_STATUSES: TeamMember["status"][] = ["active", "suspended"];

async function filterExistingStoreIds(storeIds: string[]): Promise<string[]> {
  if (storeIds.length === 0) return [];
  const stores = await getStoresByIds(storeIds);
  return stores.map((s) => s.id);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Cookie-authenticated mutation: reject cross-site callers outright.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const members = await getTeamMembers();
    const existing = members.find((m) => m.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const updates: Partial<Omit<TeamMember, "id" | "createdAt">> = {};

    if (typeof body.name === "string") updates.name = body.name.trim().slice(0, 120);
    if (typeof body.role === "string" && VALID_ROLES.includes(body.role as UserRole)) {
      updates.role = body.role as UserRole;
    }
    if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as TeamMember["status"])) {
      updates.status = body.status as TeamMember["status"];
    }
    if (Array.isArray(body.storeIds)) {
      updates.storeIds = await filterExistingStoreIds(sanitizeStringArray(body.storeIds, 100));
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
      }
      if (email === getSuperAdminEmail()) {
        return NextResponse.json(
          { error: "This email already owns the platform account" },
          { status: 409 }
        );
      }
      if (email !== existing.email) {
        const clash = await getTeamMemberByEmail(email);
        if (clash && clash.id !== id) {
          return NextResponse.json({ error: `${email} is already a team member` }, { status: 409 });
        }
      }
      updates.email = email;
    }

    const member = await updateTeamMember(id, updates);
    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (err) {
    console.error("Failed to update team member", err);
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Cookie-authenticated mutation: reject cross-site callers outright.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { id } = await context.params;
    const members = await getTeamMembers();
    const existing = members.find((m) => m.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const deleted = await deleteTeamMember(id);
    if (!deleted) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete team member", err);
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 });
  }
}
