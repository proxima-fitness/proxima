import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

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
