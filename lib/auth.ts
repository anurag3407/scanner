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

/**
 * The platform owner's email. This account is always a super admin.
 *
 * A missing, empty OR WHITESPACE-ONLY value falls back to the built-in
 * default. `process.env.X || default` is not enough on its own: a variable
 * containing only spaces or a newline is truthy, so it survived the `||` and
 * then trimmed down to "". That made `normalizedPrimary === adminEmail` true
 * for any signed-in Clerk user with no verified email address, handing full
 * super-admin to an account that had proved nothing about its identity.
 */
const DEFAULT_SUPER_ADMIN_EMAIL = "anuragmishra3407@gmail.com";

export function getSuperAdminEmail(): string {
  const configured = (process.env.ADMIN_ALLOWED_EMAIL || "").toLowerCase().trim();
  return configured || DEFAULT_SUPER_ADMIN_EMAIL;
}

/** True when the given address is the configured platform owner account. */
export function isSuperAdminEmail(email: string): boolean {
  const candidate = (email || "").toLowerCase().trim();
  // An empty candidate can never identify the owner account.
  return candidate !== "" && candidate === getSuperAdminEmail();
}

function superAdminSession(email: string): AuthResult {
  return {
    authorized: true,
    email,
    user: { email, role: "super_admin", storeIds: [], isSuperAdmin: true },
  };
}

/**
 * True only for a concrete store id.
 *
 * Store ids are minted by the server as `store_<ts>_<rand>`. Anything else — a
 * wildcard, a prototype-pollution key, an empty string, or a non-string — is
 * not a location and must never appear in a scope list.
 */
function isUsableStoreId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && /^[A-Za-z0-9_-]+$/.test(id);
}

/**
 * Resolves the signed-in Clerk user into a console identity:
 *   - the ADMIN_ALLOWED_EMAIL account is always the platform super admin
 *   - anyone else must exist in the team_members directory
 * The resolved SessionUser then drives store scoping in every API route.
 */
async function resolveSessionUser(): Promise<AuthResult> {
  const adminEmail = getSuperAdminEmail();

  // Tests bypass Clerk so suites can run without credentials — but ONLY when an
  // explicit opt-in flag is also present. Keying off NODE_ENV alone is a
  // production hazard: any deployment where the runtime variable can be
  // influenced (shared host, misconfigured container, CI runner that serves
  // traffic) would hand every visitor full super-admin access.
  if (process.env.NODE_ENV === "test" && process.env.AUTH_BYPASS_TESTS === "true") {
    return superAdminSession(adminEmail);
  }

  if (!isClerkConfigured()) {
    return {
      authorized: false,
      status: 503,
      error: "Authentication service is not configured.",
    };
  }

  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult?.userId || null;
  } catch {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in.",
    };
  }

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

  // Only VERIFIED addresses may confer access.
  //
  // Clerk lets a signed-in user attach arbitrary secondary addresses without
  // proving control of the mailbox. Matching the directory against those
  // meant anybody could add `victim@tenant.com` as an unverified secondary
  // address and inherit that tenant's console access — an account-takeover
  // path with no email confirmation at all. An unverified address proves
  // nothing about who is at the keyboard.
  const userEmails =
    user?.emailAddresses
      ?.filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase().trim()) || [];
  // The primary address is only usable if it is itself verified. If Clerk
  // reports it as unverified, fall back to the first verified address rather
  // than trusting an unproven one.
  const primaryRaw = user?.primaryEmailAddress;
  const primaryVerified = primaryRaw?.verification?.status === "verified";
  const primaryEmail = (primaryVerified
    ? primaryRaw?.emailAddress
    : userEmails[0] || "") as string;
  const normalizedPrimary = (primaryEmail || "").toLowerCase().trim();

  // 1. Platform owner: full access to everything.
  // `adminEmail` is never empty (getSuperAdminEmail falls back to a default),
  // but guard anyway: comparing an empty candidate against it would make every
  // user with no verified email a super admin.
  if (
    adminEmail !== "" &&
    (normalizedPrimary === adminEmail || userEmails.includes(adminEmail))
  ) {
    return superAdminSession(adminEmail);
  }

  // 2. Invited team members: store admins (or additional super admins).
  const candidates = Array.from(new Set([normalizedPrimary, ...userEmails].filter(Boolean)));
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

  // Fail CLOSED on any status the directory does not explicitly vouch for.
  // The local-file data path can persist arbitrary strings (a historical bug
  // let `updateTeamMember` write raw values straight through), so comparing
  // only against "suspended" meant any other value — "ACTIVE", "", a typo, a
  // deleted account — silently granted console access.
  if (member.status !== "active") {
    return {
      authorized: false,
      status: 403,
      email: member.email,
      error:
        member.status === "suspended"
          ? "This account has been suspended. Contact your platform administrator."
          : "This account is not active. Contact your platform administrator.",
    };
  }

  const role = member.role;
  const isSuperAdmin = role === "super_admin";

  // Only real, non-empty string ids count as assignments. A JSON column can
  // carry anything, and a wildcard entry such as "*" must never become a
  // scope that the data layer might one day interpret as "all locations".
  const assignments = Array.isArray(member.storeIds)
    ? member.storeIds.filter(isUsableStoreId)
    : [];

  return {
    authorized: true,
    email: member.email,
    user: {
      email: member.email,
      role,
      storeIds: isSuperAdmin ? [] : assignments,
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

/**
 * True when the assignment list is well-formed enough to scope by.
 *
 * `storeIds` is a JSON column, so a malformed or hostile value can reach it.
 * Anything that is not a plain array of real ids is treated as "no valid
 * assignments" rather than being passed to the data layer, where a wildcard
 * such as "*" could later be mistaken for a scope.
 */
function hasValidAssignments(user: SessionUser): boolean {
  return (
    Array.isArray(user.storeIds) &&
    user.storeIds.every(isUsableStoreId)
  );
}

/** Gate for a single location: super admins pass, store admins must be assigned. */
export async function assertStoreAccess(storeId: string): Promise<AuthResult> {
  const result = await resolveSessionUser();
  if (!result.authorized) return result;
  if (!result.user) {
    return { authorized: false, status: 401, error: "Authentication required. Please sign in." };
  }
  if (!hasStoreAccess(result.user, storeId) || !hasValidAssignments(result.user)) {
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
