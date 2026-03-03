/**
 * @module proxy
 *
 * Next.js middleware entry-point that delegates every matched request to the
 * Supabase session-refresh middleware. The `config.matcher` excludes static
 * assets so only page/API requests trigger a session check.
 *
 * Depends on: @/utils/supabase/middleware
 * Used by: Next.js middleware layer (middleware.ts re-exports or calls this)
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

/**
 * Proxy all matched requests through Supabase session refresh.
 *
 * @param request - The incoming Next.js request
 * @returns A NextResponse with refreshed auth cookies
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
};

/** Route matcher that excludes static assets and images from session handling. */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
