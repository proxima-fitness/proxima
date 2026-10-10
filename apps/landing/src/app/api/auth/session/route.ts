/**
 * @module auth/session
 *
 * Server-side session introspection route. Returns the currently authenticated
 * Supabase user (or null) so the client can hydrate auth state without
 * exposing service-role keys.
 *
 * Depends on: @/utils/supabase/server (Supabase SSR client)
 * Used by: Client-side auth hooks (e.g. useSession), Navbar
 */

import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

/**
 * Returns the authenticated Supabase user for the current request.
 *
 * Uses `getUser()` (server-validated) rather than `getSession()` to avoid
 * trusting the JWT alone.
 *
 * @returns JSON `{ user }` with the Supabase user object, or `{ user: null, error }`.
 */
export async function GET() {
    try {
        const supabase = await createClient()

        // Get the current user from server-side session
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser()

        if (error) {
            console.error('Error getting user:', error)
            return NextResponse.json({ user: null, error: error.message })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Error in session API:', error)
        return NextResponse.json({ user: null, error: 'Failed to get session' }, { status: 500 })
    }
}
