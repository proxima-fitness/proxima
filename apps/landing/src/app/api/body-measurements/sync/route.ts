// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module body-measurements/sync
 *
 * Processes one Hevy body-measurements backup chunk for the authenticated user.
 * Call repeatedly until `done: true` (or handle `syncError` for retry).
 *
 * Depends on: @/utils/supabase/server, api/body-measurements-sync
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { runBodyMeasurementsSyncChunk } from "@/api/body-measurements-sync";

/**
 * POST /api/body-measurements/sync - import one Hevy body-measurements page.
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

        const result = await runBodyMeasurementsSyncChunk(supabase, {
            userId: user.id,
            apiKey,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error("body-measurements sync error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
