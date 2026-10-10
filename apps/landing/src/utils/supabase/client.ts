/**
 * @module supabase/client
 *
 * Browser-side Supabase client factory. Returns a singleton-style client
 * configured with the project's public URL and anon key. Use this in
 * Client Components and browser-only code paths.
 *
 * Depends on: @supabase/ssr
 * Used by: Client Components, React hooks that call Supabase
 */

import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client suitable for use in the browser.
 *
 * @returns A browser-bound SupabaseClient instance
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY!
  )
}
