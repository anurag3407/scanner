import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk";

export interface AuthResult {
  authorized: boolean;
  status?: number;
  error?: string;
  email?: string;
}

/**
 * Strict server-side authorization check ensuring only the verified admin email
 * (anuragmishra3407@gmail.com) can access management API routes.
 */
export async function assertAdminAuth(): Promise<AuthResult> {
  const allowedEmail = (process.env.ADMIN_ALLOWED_EMAIL || "anuragmishra3407@gmail.com").toLowerCase().trim();

  // In test environment, bypass Clerk so automated test suites can execute without credentials
  if (process.env.NODE_ENV === "test") {
    return { authorized: true, email: allowedEmail };
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
    console.error("currentUser() check failed in assertAdminAuth:", err);
  }

  if (!user && process.env.CLERK_SECRET_KEY) {
    try {
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      user = await clerk.users.getUser(userId);
    } catch (err) {
      console.error("clerk.users.getUser fallback failed in assertAdminAuth:", err);
    }
  }

  const userEmails = user?.emailAddresses?.map((e) => e.emailAddress.toLowerCase().trim()) || [];
  const primaryEmail = (user?.primaryEmailAddress?.emailAddress || userEmails[0] || "").toLowerCase().trim();

  const isAuthorized = userEmails.includes(allowedEmail) || primaryEmail === allowedEmail;

  if (!isAuthorized) {
    return {
      authorized: false,
      status: 403,
      error: `Access restricted. Only ${allowedEmail} has administrative permissions.`,
    };
  }

  return {
    authorized: true,
    email: primaryEmail || allowedEmail,
  };
}
