// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/hevy-day-complete-title
 *
 * Hevy-app **Day complete** title checkmark. Same join as the builder lock:
 * Workout `routine_id` ∩ that week's **Program–Hevy link** `hevy_routine_ids`.
 * Lives next to workout backup in POST /api/hevy-program-sync — not the edge.
 * Does not auto-upload the next week or write weights.
 *
 * Depends on: @supabase/supabase-js
 * Used by: src/app/api/hevy-program-sync/route.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

type TSupabase = SupabaseClient<Database>;

/** Historical Hevy-app suffix from the old edge stamp. Two spaces + U+2705. */
export const HEVY_DAY_COMPLETE_TITLE_SUFFIX = "  ✅";

export type THevyRoutinePutBody = {
    title: string;
    notes: string;
    exercises: THevyExerciseRequest[];
};

export type THevyRoutineTitleApi = {
    getRoutine: (apiKey: string, routineId: string) => Promise<THevyRoutine>;
    putRoutine: (apiKey: string, routineId: string, payload: THevyRoutinePutBody) => Promise<void>;
};

export type TMarkLinkedHevyTitlesResult = {
    updated: number;
    skipped: number;
    failed: number;
};

/**
 * Appends the Hevy-app Day complete suffix. Idempotent.
 *
 * @param title - Live Hevy routine title
 */
export function hevyRoutineTitleWithCheckmark(title: string): string {
    if (title.endsWith(HEVY_DAY_COMPLETE_TITLE_SUFFIX)) {
        return title;
    }
    return `${title}${HEVY_DAY_COMPLETE_TITLE_SUFFIX}`;
}

/**
 * Linked Hevy routine IDs that already have a matching Workout.
 *
 * @param linkedRoutineIds - Union of `hevy_routine_ids` on the user's links
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values
 */
export function linkedRoutineIdsWithWorkouts(
    linkedRoutineIds: readonly string[],
    workoutRoutineIds: readonly string[],
): string[] {
    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of linkedRoutineIds) {
        if (!id || seen.has(id) || !logged.has(id)) {
            continue;
        }
        seen.add(id);
        ids.push(id);
    }
    return ids;
}

/**
 * PUT payload: new title, notes/exercises from the live routine. No `folder_id`
 * (Hevy would move the routine). Empty notes become a space so PUT is accepted.
 *
 * @param routine - Live Hevy GET body
 * @param title - Title to persist (already includes the checkmark when updating)
 */
export function routineToDayCompleteTitlePut(
    routine: THevyRoutine,
    title: string,
): THevyRoutinePutBody {
    const notes = routine.notes?.trim() ? routine.notes : " ";
    return {
        title,
        notes,
        exercises: (routine.exercises ?? []).map((exercise) => ({
            exercise_template_id: exercise.exercise_template_id,
            superset_id: exercise.supersets_id,
            rest_seconds: Number(exercise.rest_seconds) || 90,
            notes: exercise.notes || "",
            sets: (exercise.sets ?? []).map((set) => ({
                type: set.type || "normal",
                weight_kg: set.weight_kg,
                reps: set.reps,
                distance_meters: set.distance_meters,
                duration_seconds: set.duration_seconds,
                custom_metric: set.custom_metric,
                ...(set.rep_range != null
                    ? { rep_range: { start: set.rep_range.start, end: set.rep_range.end } }
                    : {}),
            })),
        })),
    };
}

/**
 * GET+PUT checkmarks for every linked routine that has a Workout.
 * Failures on one ID do not stop the rest. Never throws.
 *
 * @param input.apiKey - User's Hevy API key
 * @param input.linkedRoutineIds - Link `hevy_routine_ids` (any week)
 * @param input.workoutRoutineIds - Backup `routine_id`s
 * @param input.hevy - Hevy GET/PUT (tests inject; default is live HTTP)
 */
export async function markLinkedHevyRoutineTitlesComplete(input: {
    apiKey: string;
    linkedRoutineIds: readonly string[];
    workoutRoutineIds: readonly string[];
    hevy?: THevyRoutineTitleApi;
}): Promise<TMarkLinkedHevyTitlesResult> {
    const hevy = input.hevy ?? liveHevyRoutineTitleApi;
    const ids = linkedRoutineIdsWithWorkouts(input.linkedRoutineIds, input.workoutRoutineIds);
    const result: TMarkLinkedHevyTitlesResult = { updated: 0, skipped: 0, failed: 0 };

    for (const routineId of ids) {
        try {
            const routine = await hevy.getRoutine(input.apiKey, routineId);
            const nextTitle = hevyRoutineTitleWithCheckmark(routine.title ?? "");
            if (nextTitle === (routine.title ?? "")) {
                result.skipped += 1;
                continue;
            }
            await hevy.putRoutine(
                input.apiKey,
                routineId,
                routineToDayCompleteTitlePut(routine, nextTitle),
            );
            result.updated += 1;
        } catch (error: unknown) {
            result.failed += 1;
            console.warn("Hevy day-complete title PUT failed:", {
                routineId,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return result;
}

/**
 * Distinct `hevy_routine_ids` on every Program–Hevy link for this user.
 *
 * @param userId - Owner user id
 * @param client - Supabase client (RLS own-rows)
 */
export async function getUserLinkedHevyRoutineIds(
    userId: string,
    client: TSupabase,
): Promise<string[]> {
    const { data, error } = await client
        .from("program_hevy_week_links")
        .select("hevy_routine_ids")
        .eq("user_id", userId);

    if (error) {
        throw error;
    }

    const ids: string[] = [];
    const seen = new Set<string>();
    for (const row of data ?? []) {
        for (const id of row.hevy_routine_ids ?? []) {
            if (!id || seen.has(id)) {
                continue;
            }
            seen.add(id);
            ids.push(id);
        }
    }
    return ids;
}

async function getUserWorkoutRoutineIds(userId: string, client: TSupabase): Promise<string[]> {
    const { data, error } = await client
        .from("workouts")
        .select("routine_id")
        .eq("user_id", userId)
        .not("routine_id", "is", null);

    if (error) {
        throw error;
    }

    const ids = new Set<string>();
    for (const row of data ?? []) {
        if (row.routine_id) {
            ids.add(row.routine_id);
        }
    }
    return Array.from(ids);
}

/**
 * Loads link IDs + workout routine IDs, then PUTs Hevy titles.
 *
 * @param client - Request-scoped Supabase client
 * @param params.userId - Owner user id
 * @param params.apiKey - User's Hevy API key
 */
export async function markUserLinkedHevyRoutineTitlesComplete(
    client: TSupabase,
    params: { userId: string; apiKey: string },
): Promise<TMarkLinkedHevyTitlesResult> {
    const [linkedRoutineIds, workoutRoutineIds] = await Promise.all([
        getUserLinkedHevyRoutineIds(params.userId, client),
        getUserWorkoutRoutineIds(params.userId, client),
    ]);
    return markLinkedHevyRoutineTitlesComplete({
        apiKey: params.apiKey,
        linkedRoutineIds,
        workoutRoutineIds,
    });
}

function unwrapRoutine(body: TRoutineResponse | THevyRoutine): THevyRoutine {
    if ("routine" in body && body.routine && typeof body.routine === "object") {
        return body.routine;
    }
    return body as THevyRoutine;
}

const liveHevyRoutineTitleApi: THevyRoutineTitleApi = {
    async getRoutine(apiKey, routineId) {
        const response = await fetch(`https://api.hevyapp.com/v1/routines/${routineId}`, {
            method: "GET",
            headers: {
                accept: "application/json",
                "api-key": apiKey,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP GET error! Status: ${response.status}`);
        }
        const body = (await response.json()) as TRoutineResponse | THevyRoutine;
        return unwrapRoutine(body);
    },
    async putRoutine(apiKey, routineId, payload) {
        const response = await fetch(`https://api.hevyapp.com/v1/routines/${routineId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify({ routine: payload }),
        });
        if (!response.ok) {
            throw new Error(`HTTP PUT error! Status: ${response.status}`);
        }
    },
};
