import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isClerkConfigured } from "@/lib/clerk";

// The admin console and store management APIs require a signed-in Clerk user.
const isProtectedPage = createRouteMatcher(["/admin(.*)"]);
const isProtectedApi = createRouteMatcher(["/api/stores(.*)", "/api/analytics(.*)"]);
const isFeedbackApi = createRouteMatcher(["/api/feedback(.*)"]);

const SIGN_IN_PATH = "/sign-in";

function requiresAuth(req: NextRequest): boolean {
  return (
    isProtectedPage(req) ||
    isProtectedApi(req) ||
    // GET/PATCH on /api/feedback are manager tools, but POST must stay public
    // so a diner can send a complaint to the GM without an account.
    (isFeedbackApi(req) && req.method !== "POST")
  );
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!requiresAuth(req) || userId) {
    return;
  }

  if (isProtectedPage(req)) {
    // Explicit redirect instead of auth.protect(), which mis-resolves the
    // sign-in URL in the Next.js 16 proxy runtime when the env var is not
    // inlined at build time.
    const signInUrl = new URL(SIGN_IN_PATH, req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isClerkConfigured()) {
    return withClerk(request, event);
  }

  // Clerk keys are missing: keep the public review experience fully functional
  // and fail closed on admin surfaces with an actionable message.
  if (!requiresAuth(request)) {
    return NextResponse.next();
  }

  if (isProtectedPage(request)) {
    return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?setup=required`, request.url));
  }

  return NextResponse.json(
    {
      error:
        "Admin authentication is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
    },
    { status: 503 }
  );
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
