/**
 * @module workout-history/workouts
 *
 * Cursor-paginated browse list of backed-up workouts as {@link THevyRoutine} previews.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
    DEFAULT_WORKOUT_HISTORY_LIMIT,
    PREVIEW_MAX_EXERCISES,
    getWorkoutsForUser,
    mapBackedUpWorkoutToHevyRoutine,
} from "@/api/workout-history-read";

/**
 * GET /api/workout-history/workouts — cursor-paginated logged workout previews.
 *
 * Query: `limit`, `cursorStartedAt`, `cursorId`, `preview=true` (caps exercises at 3).
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limitParam = searchParams.get("limit");
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_WORKOUT_HISTORY_LIMIT;
        const limit =
            Number.isFinite(parsedLimit) && parsedLimit > 0
                ? parsedLimit
                : DEFAULT_WORKOUT_HISTORY_LIMIT;
        const preview = searchParams.get("preview") === "true";
        const cursorStartedAt = searchParams.get("cursorStartedAt") ?? undefined;
        const cursorId = searchParams.get("cursorId") ?? undefined;

        const page = await getWorkoutsForUser(supabase, user.id, {
            limit,
            cursorStartedAt,
            cursorId,
        });

        const workouts: TLoggedWorkoutPreviewItem[] = page.workouts.map((workout) => ({
            workout: mapBackedUpWorkoutToHevyRoutine(workout, {
                previewMaxExercises: preview ? PREVIEW_MAX_EXERCISES : undefined,
            }),
            totalExerciseCount: workout.workout_exercises?.length ?? 0,
        }));

        return NextResponse.json({
            workouts,
            nextCursor: page.nextCursor,
        } satisfies TLoggedWorkoutBrowsePage);
    } catch (err) {
        console.error("workout-history workouts list error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
