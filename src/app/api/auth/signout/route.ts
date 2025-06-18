import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

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
