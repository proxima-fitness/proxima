/**
 * @module api/supabase-admin
 *
 * Lazily-created service-role Supabase client for the few writes that must bypass RLS
 * because they touch shared, non-user-owned data. Server-only: `SUPABASE_SECRET_KEY` is not
 * exposed to the browser, so this returns `null` in client bundles and callers fall back.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase (generated types)
 * Used by: api/workout-history (Hevy exercise template mirror)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Returns the service-role client, or `null` when its credentials are unavailable.
 * Never hand this to a request-scoped read - it sees every user's rows.
 */
export function getServiceRoleClient(): SupabaseClient<Database> | null {
    if (cachedClient) {
        return cachedClient;
    }

    const url = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
        return null;
    }

    cachedClient = createClient<Database>(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    return cachedClient;
}
