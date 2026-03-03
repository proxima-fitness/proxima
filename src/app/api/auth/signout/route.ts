/**
 * @module auth/signout
 *
 * Server-side sign-out API route. Invalidates the current Supabase session
 * so the user is logged out on both client and server.
 *
 * Depends on: @/utils/supabase/server (Supabase SSR client)
 * Used by: Navbar sign-out button, client-side auth hooks
 */

import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

/**
 * Signs out the currently authenticated user by destroying their Supabase session.
 *
 * @returns JSON `{ success: true }` on success, or `{ success: false, error }` with status 500.
 */
export async function POST() {
    try {
        const supabase = await createClient()

        // Get the current session
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
            // Sign out the user
            await supabase.auth.signOut()
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error signing out:', error)
        return NextResponse.json({ success: false, error: 'Failed to sign out' }, { status: 500 })
    }
}
