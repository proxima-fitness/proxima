// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/program-prescription
 *
 * Server-safe read of one **Program prescription** week as Hevy routines.
 * Mirrors the shape `convertToHevyRoutine` produces for the builder grid
 * (folder_id = 0-based week, order = 1-based day, 0-based exercise/set arrays)
 * without pulling client-only builder deps into a route handler.
 *
 * Row ids are kept (`id` = schedule_workouts row, exercise `reason` untouched)
 * so an apply path can map a mutation back to the prescription rows.
 *
 * Server-safe: callers pass the client (no browser client import), like
 * `workout-history-read`.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./mesocycle-blocks
 * Used by: /api/programs/week-suggest, program-prescription-write (ADR 0012)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { parseMesocycleBlocks, type TMesocycleBlock } from "./mesocycle-blocks";

type TSupabase = SupabaseClient<Database>;

export type TProgramPrescriptionMeta = {
    id: number;
    title: string;
    /** Weeks in the prescription; null when the program never stored one. */
    programLength: number | null;
    /**
     * First-build **Mesocycle blocks** (ADR 0032 / 04). Null when the program
     * was not a First build or the stored JSON is not the documented shape.
     */
    mesocycleBlocks: TMesocycleBlock[] | null;
};

/** Raw prescription exercise row (per-set arrays), as stored in Supabase. */
export type TPrescriptionExerciseRow = {
    id?: string | null;
    created_at?: string | null;
    reps?: Array<number | null> | null;
    reps_max?: number[] | null;
    reps_range?: unknown;
    rpe?: number[] | null;
    rpe_range?: number[][] | null;
    time_taken?: number[] | null;
    time_range?: number[][] | null;
    amrap?: string[] | null;
    percent_rm?: number[] | null;
    weights?: Array<number | null> | null;
    set_types?: string[] | null;
    hevy_exercise_templates?: { id?: string | null; title?: string | null } | null;
};

export type TPrescriptionDayRow = {
    id?: string | null;
    nthDay?: number | null;
    nthWeek?: number | null;
    day_title?: string | null;
    program_workout_exercises?: TPrescriptionExerciseRow[] | null;
};

const PRESCRIPTION_WEEK_SELECT = `
    id,
    nthDay,
    nthWeek,
    day_title,
    program_workout_exercises (
        id,
        created_at,
        reps,
        reps_max,
        reps_range,
        rpe,
        rpe_range,
        time_taken,
        time_range,
        amrap,
        percent_rm,
        weights,
        set_types,
        hevy_exercise_templates ( id, title )
    )
`;

function positiveOrNull(value: number | null | undefined): number | null {
    return value == null || value <= 0 ? null : value;
}

function repRangeAt(repsRange: unknown, index: number): THevyRepRange | null {
    if (!Array.isArray(repsRange)) {
        return null;
    }
    const entry = repsRange[index];
    if (!Array.isArray(entry) || entry.length < 2) {
        return null;
    }
    const [start, end] = entry;
    if (typeof start !== "number" || typeof end !== "number") {
        return null;
    }
    return { start, end };
}

/**
 * Builds Hevy sets from one prescription exercise row's per-set arrays.
 * Set index = array index; mirrors builder `generateHevySets` semantics.
 *
 * @param exercise - Prescription exercise row
 */
export function buildPrescriptionSets(exercise: TPrescriptionExerciseRow): THevySets[] {
    const repsRange = Array.isArray(exercise.reps_range) ? exercise.reps_range : [];
    const setCount = Math.max(
        exercise.reps?.length ?? 0,
        exercise.weights?.length ?? 0,
        exercise.rpe?.length ?? 0,
        exercise.rpe_range?.length ?? 0,
        exercise.time_taken?.length ?? 0,
        exercise.time_range?.length ?? 0,
        exercise.reps_max?.length ?? 0,
        exercise.amrap?.length ?? 0,
        exercise.percent_rm?.length ?? 0,
        repsRange.length,
    );

    const sets: THevySets[] = [];
    for (let index = 0; index < setCount; index += 1) {
        const rep_range = repRangeAt(exercise.reps_range, index);
        const rpe = exercise.rpe?.[index] ?? exercise.rpe_range?.[index]?.[1] ?? null;
        const duration =
            exercise.time_taken?.[index] ?? exercise.time_range?.[index]?.[1] ?? null;

        sets.push({
            index,
            type: exercise.set_types?.[index] ?? "normal",
            weight_kg: positiveOrNull(exercise.weights?.[index]),
            reps: rep_range ? null : (exercise.reps?.[index] ?? null),
            distance_meters: null,
            duration_seconds: positiveOrNull(duration),
            rpe: positiveOrNull(rpe),
            custom_metric: null,
            rep_range,
        });
    }

    return sets;
}

/**
 * Days in day order — array position + 1 is the `dayOrder` an operation targets.
 *
 * @param days - `schedule_workouts` rows for a single week
 */
export function sortPrescriptionDays(
    days: readonly TPrescriptionDayRow[],
): TPrescriptionDayRow[] {
    return [...days].sort((a, b) => (a.nthDay ?? 0) - (b.nthDay ?? 0));
}

/**
 * Exercises in insertion order — array position is the 0-based `exerciseIndex`.
 *
 * @param exercises - `program_workout_exercises` rows for a single day
 */
export function sortPrescriptionExercises(
    exercises: readonly TPrescriptionExerciseRow[],
): TPrescriptionExerciseRow[] {
    return [...exercises].sort((a, b) => {
        const byCreated = (a.created_at ?? "").localeCompare(b.created_at ?? "");
        if (byCreated !== 0) {
            return byCreated;
        }
        return (a.id ?? "").localeCompare(b.id ?? "");
    });
}

/**
 * Maps prescription day rows for one week to Hevy routines (display order).
 * Days sort by `nthDay`; exercises keep insertion order (`created_at`, then id).
 *
 * @param days - `schedule_workouts` rows for a single week
 * @param nthWeek - 1-based week number (folder_id = nthWeek - 1)
 */
export function mapPrescriptionWeekToRoutines(
    days: readonly TPrescriptionDayRow[],
    nthWeek: number,
): THevyRoutine[] {
    const sortedDays = sortPrescriptionDays(days);

    return sortedDays.map((day, dayIndex) => {
        const exercises = sortPrescriptionExercises(day.program_workout_exercises ?? []);

        return {
            id: day.id ?? String(dayIndex + 1),
            title: day.day_title
                ? `${dayIndex + 1} - ${day.day_title}`
                : `Day ${dayIndex + 1}`,
            folder_id: nthWeek - 1,
            notes: "",
            order: String(dayIndex + 1),
            exercises: exercises.map((exercise, exerciseIndex) => ({
                index: exerciseIndex,
                title: exercise.hevy_exercise_templates?.title ?? "Unknown Exercise",
                notes: "",
                rest_seconds: null,
                exercise_template_id: exercise.hevy_exercise_templates?.id ?? "",
                supersets_id: null,
                sets: buildPrescriptionSets(exercise),
            })),
        };
    });
}

/**
 * Program title, length, and stored Mesocycle blocks for prescription reads.
 * Null when not found.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 */
export async function getProgramPrescriptionMeta(
    client: TSupabase,
    programId: number,
): Promise<TProgramPrescriptionMeta | null> {
    const { data, error } = await client
        .from("programs")
        .select("id, title, program_length, mesocycle_blocks")
        .eq("id", programId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        id: data.id,
        title: data.title ?? "Proxima Program",
        programLength: data.program_length ?? null,
        mesocycleBlocks: parseMesocycleBlocks(data.mesocycle_blocks),
    };
}

/**
 * Raw day + exercise rows for one prescription week (row ids intact).
 * The apply path (ADR 0012 / 03) writes through these ids; the week filter is
 * what keeps a write inside a single week.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number
 */
export async function getPrescriptionWeekRows(
    client: TSupabase,
    programId: number,
    nthWeek: number,
): Promise<TPrescriptionDayRow[]> {
    if (!Number.isInteger(nthWeek) || nthWeek < 1) {
        return [];
    }

    const { data, error } = await client
        .from("schedule_workouts")
        .select(PRESCRIPTION_WEEK_SELECT)
        .eq("program_id", programId)
        .eq("nthWeek", nthWeek)
        .order("nthDay", { ascending: true })
        .overrideTypes<TPrescriptionDayRow[], { merge: false }>();

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Prescription week N as Hevy routines (empty when the week has no days).
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number
 */
export async function getPrescriptionWeekRoutines(
    client: TSupabase,
    programId: number,
    nthWeek: number,
): Promise<THevyRoutine[]> {
    const days = await getPrescriptionWeekRows(client, programId, nthWeek);
    return mapPrescriptionWeekToRoutines(days, nthWeek);
}
