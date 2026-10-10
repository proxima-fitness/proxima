// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module hevy/exercise-history
 *
 * Blind Spot stall analysis from the workout history backup (Supabase), not live
 * Hevy `/exercise_history` fan-out. Ensures backup freshness before read.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 * Used by: BlindSpotAnalysisSection via useExerciseStallsAnalysis
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getServerHasActiveSubscription } from "@/lib/server-feature-limits";
import {
    ensureWorkoutHistoryFresh,
    getExerciseStallAnalysisForUser,
    getSyncProgress,
} from "@/api/workout-history-read";

/**
 * POST /api/hevy/exercise-history - backup-based stall analysis per exercise template.
 *
 * Body: `{ exerciseTemplateIds?: string[] }`
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const requestedIds = body?.exerciseTemplateIds as string[] | undefined;

        const { data: apiKey, error: keyError } = await supabase.rpc("read_secret", {
            secret_name: `hevy_api_key_${user.id}`,
        });

        if (keyError || !apiKey) {
            return NextResponse.json([]);
        }

        const progress = await getSyncProgress(supabase, user.id, { apiKey });

        if (progress.syncError) {
            return NextResponse.json(
                { error: "sync_error", message: progress.syncError, progress },
                { status: 503 },
            );
        }

        await ensureWorkoutHistoryFresh(supabase, {
            userId: user.id,
            apiKey,
        });

        const isPro = await getServerHasActiveSubscription(supabase, user);
        const results = await getExerciseStallAnalysisForUser(supabase, user.id, {
            isPro,
            exerciseTemplateIds: requestedIds,
        });

        return NextResponse.json(results);
    } catch (err) {
        console.error("exercise-history API error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
