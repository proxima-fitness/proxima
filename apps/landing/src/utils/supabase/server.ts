/**
 * @module supabase/server
 *
 * Server-side Supabase client factory for use in Server Components,
 * Server Actions, and Route Handlers. Reads and writes auth cookies
 * via Next.js's `cookies()` API so the server can access the
 * authenticated user session.
 *
 * Depends on: @supabase/ssr, next/headers
 * Used by: Server Components, API route handlers, Server Actions
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client bound to the current request's cookies.
 *
 * The returned client transparently reads/writes auth tokens from the
 * Next.js cookie store, keeping the server-side session in sync with
 * the browser.
 *
 * @returns A server-bound SupabaseClient instance
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY!,
        {
        cookies: {
            getAll() {
            return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
            try {
                cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
                );
            } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
            }
            },
        },
        },
    );
    }
