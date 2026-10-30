import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that must always be accessible without authentication or redirect
const isPublicRoute = createRouteMatcher([
  "/",
  "/terms",
  "/privacy",
  "/get-started",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sitemap.xml",
  "/robots.txt",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes are always accessible without authentication
  if (isPublicRoute(req)) {
    return;
  }
  // Guest mode allowed: We do not protect routes at the middleware level so unauthenticated users can access the app
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
