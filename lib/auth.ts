import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk";
import { getTeamMemberByEmail } from "./store";
import { SessionUser } from "./types";

export interface AuthResult {
  authorized: boolean;
  status?: number;
  error?: string;
  email?: string;
  /** Present whenever authorized: the resolved console identity. */
  user?: SessionUser;
}

/** The platform owner's email. This account is always a super admin. */
export function getSuperAdminEmail(): string {
  return (process.env.ADMIN_ALLOWED_EMAIL || "anuragmishra3407@gmail.com").toLowerCase().trim();
}

/** True when the given address is the configured platform owner account. */
export function isSuperAdminEmail(email: string): boolean {
  return (email || "").toLowerCase().trim() === getSuperAdminEmail();
}

function superAdminSession(email: string): AuthResult {
  return {
    authorized: true,
    email,
    user: { email, role: "super_admin", storeIds: [], isSuperAdmin: true },
  };
}

/**
 * Resolves the signed-in Clerk user into a console identity:
 *   - the ADMIN_ALLOWED_EMAIL account is always the platform super admin
 *   - anyone else must exist in the team_members directory
 * The resolved SessionUser then drives store scoping in every API route.
 */
async function resolveSessionUser(): Promise<AuthResult> {
  const adminEmail = getSuperAdminEmail();

  // In test environment, bypass Clerk so automated test suites can execute without credentials
  if (process.env.NODE_ENV === "test") {
    return superAdminSession(adminEmail);
  }

  if (!isClerkConfigured()) {
    return {
      authorized: false,
      status: 503,
      error: "Authentication service is not configured.",
    };
  }

  const { userId } = await auth();
  if (!userId) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in.",
    };
  }

  let user = null;
  try {
    user = await currentUser();
  } catch (err) {
    console.error("currentUser() check failed in resolveSessionUser:", err);
  }

  if (!user && process.env.CLERK_SECRET_KEY) {
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      user = await clerk.users.getUser(userId);
    } catch (err) {
      console.error("clerk.users.getUser fallback failed in resolveSessionUser:", err);
    }
  }

  const userEmails = user?.emailAddresses?.map((e) => e.emailAddress.toLowerCase().trim()) || [];
  const primaryEmail = (user?.primaryEmailAddress?.emailAddress || userEmails[0] || "")
    .toLowerCase()
    .trim();

  // 1. Platform owner: full access to everything.
  if (userEmails.includes(adminEmail) || primaryEmail === adminEmail) {
    return superAdminSession(adminEmail);
  }

  // 2. Invited team members: store admins (or additional super admins).
  const candidates = Array.from(new Set([primaryEmail, ...userEmails].filter(Boolean)));
  let member = null;
  for (const candidate of candidates) {
    member = await getTeamMemberByEmail(candidate);
    if (member) break;
  }

  if (!member) {
    return {
      authorized: false,
      status: 403,
      email: primaryEmail,
      error:
        "Access restricted. Ask your platform administrator to invite this email to the console.",
    };
  }

  if (member.status === "suspended") {
    return {
      authorized: false,
      status: 403,
      email: member.email,
      error: "This account has been suspended. Contact your platform administrator.",
    };
  }

  const role = member.role;
  const isSuperAdmin = role === "super_admin";

  return {
    authorized: true,
    email: member.email,
    user: {
      email: member.email,
      role,
      storeIds: isSuperAdmin ? [] : member.storeIds || [],
      isSuperAdmin,
    },
  };
}

/** Returns the signed-in console identity, or null when not authorized. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await resolveSessionUser();
  return result.authorized && result.user ? result.user : null;
}

/** Any console user (super admin or store admin) — the normal API gate. */
export async function assertAdminAuth(): Promise<AuthResult> {
  return resolveSessionUser();
}

/** Platform-owner-only actions: creating / deleting locations, managing team members. */
export async function assertSuperAdmin(): Promise<AuthResult> {
  const result = await resolveSessionUser();
  if (!result.authorized) return result;
  if (!result.user?.isSuperAdmin) {
    return {
      authorized: false,
      status: 403,
      error: "Only the platform owner can perform this action.",
    };
  }
  return result;
}

/** True when the console user may read or edit the given location. */
export function hasStoreAccess(user: SessionUser, storeId: string): boolean {
  return user.isSuperAdmin || user.storeIds.includes(storeId);
}

/** Gate for a single location: super admins pass, store admins must be assigned. */
export async function assertStoreAccess(storeId: string): Promise<AuthResult> {
  const result = await resolveSessionUser();
  if (!result.authorized) return result;
  if (!result.user) {
    return { authorized: false, status: 401, error: "Authentication required. Please sign in." };
  }
  if (!hasStoreAccess(result.user, storeId)) {
    return { authorized: false, status: 403, error: "You do not have access to this location." };
  }
  return result;
}

/**
 * The store ids to filter list endpoints by. `null` means "no filter" —
 * super admins see every location.
 */
export function scopedStoreIds(user: SessionUser): string[] | null {
  return user.isSuperAdmin ? null : user.storeIds;
}
