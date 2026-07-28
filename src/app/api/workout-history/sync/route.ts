/**
 * @module workout-history/sync
 *
 * Processes one Hevy backup chunk for the authenticated user.
 * Call repeatedly until `done: true` (or handle `syncError` for retry).
 *
 * Depends on: @/utils/supabase/server, api/workout-history-sync
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runSyncChunk } from "@/api/workout-history-sync";

/**
 * POST /api/workout-history/sync - import one Hevy workouts page.
 */
export async function POST() {
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

        const result = await runSyncChunk(supabase, {
            userId: user.id,
            apiKey,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error("workout-history sync error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
