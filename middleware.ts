// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",  // ← ADD THIS LINE
  "/auth/callback",
  "/auth/auth-code-error",
  "/error",
  "/api/health",
  "/onboarding",
  "/questionnaire",
]);

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff2?|ttf)$/i.test(pathname)
  );
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // ✅ Never touch API or static
  if (isAssetPath(pathname) || isApiPath(pathname)) {
    const response = NextResponse.next();

    // Add performance headers for static assets
    if (isAssetPath(pathname)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Add caching headers for API routes
    if (isApiPath(pathname)) {
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    }

    return response;
  }

  // Keep session fresh for app routes only
  const { response, user, supabase } = await updateSession(req);

  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAuthRoute = pathname.startsWith("/auth");
  const isPublicProfile = pathname.startsWith("/profile/"); // Allow public profile viewing
  const isProblemsPage = pathname.startsWith("/problems"); // Allow browsing problems

  // Not logged in → only allow public routes, auth routes, public profiles, and problems browsing
  if (!user && !isPublic && !isAuthRoute && !isPublicProfile && !isProblemsPage) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Logged in → handle onboarding/questionnaire flow
  if (user) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("questionnaire_completed, federal_school_code")
      .eq("user_id", user.id)
      .single();

    if (!error && profile) {
      const onDashboardPage    = pathname === "/dashboard";
      const onProblemPage      = pathname === "/problem-page";
      const onProfilePage      = pathname === "/profile";
      const onSignupPage       = pathname === "/signup"; // ← ADD THIS
      const onLoginPage        = pathname === "/login";  // ← ADD THIS
      const onAuth             = isAuthRoute || pathname === "/logout";

      const completed = profile.questionnaire_completed;

      // ✅ If already logged in, don't allow signup/login pages - always redirect to dashboard
      if (onSignupPage || onLoginPage) {
        return NextResponse.redirect(new URL("/dashboard", origin));
      }

      // ✅ Allow problem page for authenticated users
      if (onProblemPage) {
        return response;
      }

      if (completed) {
        // Allow access to app pages for completed users
        const allowedAppPages = [
          "/dashboard",
          "/profile", 
          "/settings",
          "/problems",
          "/mock-interview",
          "/study-pods",
          "/leaderboards",
          "/discuss"
        ];
        const isAllowedAppPage = allowedAppPages.some(page => pathname.startsWith(page));
        
        if (!isAllowedAppPage && !onAuth) {
          return NextResponse.redirect(new URL("/dashboard", origin));
        }
        return response;
      }

      // User hasn't completed onboarding/questionnaire - redirect to dashboard where modals will show
      if (!completed && !onDashboardPage && !onAuth) {
        return NextResponse.redirect(new URL("/dashboard", origin));
      }
    }
  }

  return response;
}

// ✅ Exclude /api/* at the matcher level too
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff2?|ttf)$).*)",
  ],
};