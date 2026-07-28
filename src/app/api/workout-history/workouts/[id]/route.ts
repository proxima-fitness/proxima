/**
 * @module workout-history/workouts/[id]
 *
 * Full backed-up workout detail as {@link THevyRoutine}.
 *
 * Depends on: @/utils/supabase/server, api/workout-history-read
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWorkoutById, mapBackedUpWorkoutToHevyRoutine } from "@/api/workout-history-read";

type TRouteContext = {
    params: Promise<{ id: string }>;
};

/**
 * GET /api/workout-history/workouts/[id] - full nested logged workout.
 */
export async function GET(_request: Request, context: TRouteContext) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workout = await getWorkoutById(supabase, user.id, id);
        if (!workout) {
            return NextResponse.json({ error: "Workout not found" }, { status: 404 });
        }

        return NextResponse.json(mapBackedUpWorkoutToHevyRoutine(workout));
    } catch (err) {
        console.error("workout-history workout detail error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
