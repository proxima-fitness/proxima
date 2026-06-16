/**
 * @module workout-history/progress
 *
 * Returns derived backup progress for the authenticated user.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSyncProgress } from "@/api/workout-history-read";

/**
 * GET /api/workout-history/progress — backed-up count vs live Hevy total.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: apiKey, error: keyError } = await supabase.rpc("read_secret", {
            secret_name: `hevy_api_key_${user.id}`,
        });

        if (keyError || !apiKey) {
            return NextResponse.json({ error: "Hevy API key not found" }, { status: 400 });
        }

        const progress = await getSyncProgress(supabase, user.id, { apiKey });

        return NextResponse.json(progress);
    } catch (err) {
        console.error("workout-history progress error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
