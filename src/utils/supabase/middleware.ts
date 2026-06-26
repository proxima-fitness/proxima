/**
 * @module supabase/middleware
 *
 * Next.js middleware helper that refreshes the Supabase auth session on
 * every matched request. Reads auth tokens from request cookies, attempts
 * a token refresh via `getUser()` (with a hard timeout to avoid blocking
 * Vercel's runtime limit), and copies refreshed cookies back onto the
 * outgoing response so the browser stays in sync.
 *
 * Depends on: @supabase/ssr, next/server
 * Used by: src/proxy.ts (the Next.js middleware entry-point)
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase auth session for an incoming request.
 *
 * Creates a server-side Supabase client wired to the request/response
 * cookies, calls `getSession()` (local, instant) and conditionally
 * `getUser()` (network, with a 4 s timeout) to refresh tokens. The
 * returned response carries updated auth cookies that the browser needs
 * to stay authenticated.
 *
 * @param request - The incoming Next.js middleware request
 * @returns A NextResponse with refreshed Supabase auth cookies
 */
export async function updateSession(request: NextRequest) {

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY!,
        {
        cookies: {
            getAll() {
            return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
                request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
            );
            },
        },
        },
    );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Fix for timeout issue: Use fast path with getSession() first, then conditional getUser()
  // Since client has localStorage fallback, we don't need to block on getUser()
  try {
    // Fast path: getSession() reads from cookies locally (no network, instant)
    const { data: { session } } = await supabase.auth.getSession();

    // Only attempt token refresh with getUser() if we have a session
    // This prevents unnecessary network calls for logged-out users
    if (session) {
      // Strict 2-second timeout to prevent Vercel 60s runtime timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth check timeout')), 4000);
      });

      // Race getUser() against timeout - if it takes >2s, we bail out immediately
      // Client-side auth (localStorage) will handle session if this times out
      try {
        await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise
        ]);
      } catch (error) {
        // Timeout or error - log but don't block
        // The setAll callback will still update cookies if getUser() completes in background
        if (error instanceof Error && error.message === 'Auth check timeout') {
          console.warn('Middleware: Auth check timed out after 4s, continuing without blocking');
        } else {
          console.error('Middleware: Error in getUser() call:', error);
        }
        // Continue with response - client will handle auth via localStorage
      }
    }
    // If no session, skip getUser() entirely - no need to make network call
  } catch (error) {
    // If getSession() fails (shouldn't happen as it's local), log but don't block
    console.error('Middleware: Error getting session:', error);
    // Continue with the response - don't block the request
  }

//   if (
//     !user &&
//     !request.nextUrl.pathname.startsWith('/login') &&
//     !request.nextUrl.pathname.startsWith('/auth')
//   ) {
//     // no user, potentially respond by redirecting the user to the login page
//     const url = request.nextUrl.clone()
//     url.pathname = '/login'
//     return NextResponse.redirect(url)
//   }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
