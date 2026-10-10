// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/program-prescription-write
 *
 * Writes **AI week suggest** changes into the **Program prescription**
 * (ADR 0012 / 03). Takes `update_set` registry operations, resolves them
 * against one week's `schedule_workouts` → `program_workout_exercises` rows,
 * and patches the per-set arrays on the exercises they touch.
 *
 * Week containment is structural, not advisory: rows are read for the target
 * week only, and an operation carrying any other `folderIds` is skipped rather
 * than retargeted — applying can never reach week N or week N+2.
 *
 * Two prescription shapes it deliberately refuses (see {@link planWeekSetUpdates}):
 * `add_exercise_notes` (no exercise-level notes column exists) and rep-range
 * edits that would leave `reps_range` jagged, which multi-dimensional
 * Postgres arrays cannot store.
 *
 * Every row update selects the row back: RLS drops a disallowed UPDATE without
 * raising an error, so "no error" is not evidence of a write (the missing
 * owner UPDATE policy is `20260726190000_program_workout_exercises_update_policy`).
 *
 * Server-safe: callers pass the client, like `program-prescription`.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, program-prescription,
 *             program-builder/mutations/schemas (zod-only)
 * Used by: /api/programs/week-suggest/apply (ADR 0012)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type {
    addExerciseNotesSchema,
    updateSetSchema,
} from "@/components/program-builder/mutations/schemas";
import type { Database } from "@/hooks/supabase";
import {
    buildPrescriptionSets,
    getPrescriptionWeekRows,
    sortPrescriptionDays,
    sortPrescriptionExercises,
    type TPrescriptionDayRow,
    type TPrescriptionExerciseRow,
} from "./program-prescription";

type TSupabase = SupabaseClient<Database>;

type TExerciseUpdate = Database["public"]["Tables"]["program_workout_exercises"]["Update"];

/** Operations a week suggestion can carry (mirrors `weekSuggestOperationSchema`). */
export type TPrescriptionWriteOperation =
    | z.infer<typeof updateSetSchema>
    | z.infer<typeof addExerciseNotesSchema>;

/** Per-set columns one exercise row rewrites; only touched columns appear. */
export type TPrescriptionExercisePatch = {
    weights?: Array<number | null>;
    reps?: Array<number | null>;
    rpe?: Array<number | null>;
    reps_range?: number[][];
};

export type TPlannedExerciseUpdate = {
    /** `program_workout_exercises.id` the patch writes to. */
    exerciseId: string;
    patch: TPrescriptionExercisePatch;
};

export type TWeekSetUpdatePlan = {
    updates: TPlannedExerciseUpdate[];
    /** Operations that changed at least one set value. */
    applied: number;
    /** Operations the prescription could not take (see module docblock). */
    skipped: number;
};

export type TApplyWeekSetUpdatesInput = {
    programId: number;
    /** 1-based week N+1 — the only week these writes may touch. */
    targetWeek: number;
    operations: readonly TPrescriptionWriteOperation[];
};

export type TApplyWeekSetUpdatesResult = {
    applied: number;
    skipped: number;
    /** Exercise rows actually written. */
    exercisesUpdated: number;
};

type TTouchedColumns = {
    weights: boolean;
    reps: boolean;
    rpe: boolean;
    reps_range: boolean;
};

type TWorkingExercise = {
    exerciseId: string;
    /** Current set values, mutated as operations land. */
    sets: THevySets[];
    /** True when every set carries a rep range (how the writer stores them). */
    isRangeBased: boolean;
    touched: TTouchedColumns;
};

/** Whether an operation stays inside the week the plan is for. */
function targetsWeek(
    operation: TPrescriptionWriteOperation,
    weekIndex: number,
): boolean {
    const folderIds = operation.folderIds;
    if (folderIds == null) {
        // Week-agnostic op: the caller already scoped the rows to one week.
        return true;
    }
    return folderIds.length === 1 && folderIds[0] === weekIndex;
}

function workingExercise(exercise: TPrescriptionExerciseRow): TWorkingExercise | null {
    if (!exercise.id) {
        return null;
    }

    const sets = buildPrescriptionSets(exercise);

    return {
        exerciseId: exercise.id,
        sets,
        isRangeBased: sets.length > 0 && sets.every((set) => set.rep_range != null),
        touched: { weights: false, reps: false, rpe: false, reps_range: false },
    };
}

function patchFromWorking(working: TWorkingExercise): TPrescriptionExercisePatch {
    const patch: TPrescriptionExercisePatch = {};

    if (working.touched.weights) {
        patch.weights = working.sets.map((set) => set.weight_kg ?? null);
    }
    if (working.touched.reps) {
        patch.reps = working.sets.map((set) => set.reps ?? null);
    }
    if (working.touched.rpe) {
        patch.rpe = working.sets.map((set) => set.rpe ?? null);
    }
    if (working.touched.reps_range) {
        patch.reps_range = working.sets.map((set) => [
            set.rep_range?.start ?? 0,
            set.rep_range?.end ?? 0,
        ]);
    }

    return patch;
}

/**
 * Resolves suggestion operations to per-exercise column patches for one week.
 * Pure — no client, no clock — so week containment is unit-testable.
 *
 * An operation is skipped (never retargeted) when it names another week, a day
 * / exercise / set that does not exist, an exercise-level note (the
 * prescription has no column for one), fixed reps on a range-based exercise, or
 * a rep range on an exercise that stores fixed reps. The last two would leave
 * `reps_range` jagged, which `float4[][]` cannot store.
 *
 * @param days - `schedule_workouts` rows for the target week only
 * @param operations - Suggested registry operations, in order
 * @param weekIndex - 0-based folder id of the target week (targetWeek - 1)
 */
export function planWeekSetUpdates(
    days: readonly TPrescriptionDayRow[],
    operations: readonly TPrescriptionWriteOperation[],
    weekIndex: number,
): TWeekSetUpdatePlan {
    const sortedDays = sortPrescriptionDays(days);
    const working = new Map<string, TWorkingExercise>();
    const order: string[] = [];
    let applied = 0;
    let skipped = 0;

    for (const operation of operations) {
        if (operation.op !== "update_set" || !targetsWeek(operation, weekIndex)) {
            skipped += 1;
            continue;
        }

        const day = sortedDays[operation.dayOrder - 1];
        if (!day) {
            skipped += 1;
            continue;
        }

        const exercises = sortPrescriptionExercises(day.program_workout_exercises ?? []);
        const exercise = exercises[operation.exerciseIndex];
        if (!exercise?.id) {
            skipped += 1;
            continue;
        }

        let state = working.get(exercise.id);
        if (!state) {
            const created = workingExercise(exercise);
            if (!created) {
                skipped += 1;
                continue;
            }
            state = created;
            working.set(exercise.id, state);
            order.push(exercise.id);
        }

        const set = state.sets[operation.setIndex];
        if (!set) {
            skipped += 1;
            continue;
        }

        const patch = operation.set;
        let changed = false;

        if (patch.weight_kg !== undefined) {
            set.weight_kg = patch.weight_kg ?? null;
            state.touched.weights = true;
            changed = true;
        }

        if (patch.rpe !== undefined) {
            set.rpe = patch.rpe ?? null;
            state.touched.rpe = true;
            changed = true;
        }

        if (patch.reps !== undefined && !state.isRangeBased) {
            set.reps = patch.reps ?? null;
            state.touched.reps = true;
            changed = true;
        }

        if (patch.rep_range != null && state.isRangeBased) {
            set.rep_range = { start: patch.rep_range.start, end: patch.rep_range.end };
            state.touched.reps_range = true;
            changed = true;
        }

        if (changed) {
            applied += 1;
        } else {
            skipped += 1;
        }
    }

    const updates: TPlannedExerciseUpdate[] = [];
    for (const exerciseId of order) {
        const state = working.get(exerciseId);
        if (!state) {
            continue;
        }
        const patch = patchFromWorking(state);
        if (Object.keys(patch).length > 0) {
            updates.push({ exerciseId, patch });
        }
    }

    return { updates, applied, skipped };
}

/**
 * Writes suggested set changes into the prescription for one week.
 * Reads that week's rows, plans the patches, then updates the exercise rows it
 * touched — nothing outside week `targetWeek` is read or written.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param input - Program, target week, and the operations to apply
 */
export async function applyWeekSetUpdates(
    client: TSupabase,
    input: TApplyWeekSetUpdatesInput,
): Promise<TApplyWeekSetUpdatesResult> {
    const { programId, targetWeek, operations } = input;

    if (!Number.isInteger(targetWeek) || targetWeek < 1) {
        return { applied: 0, skipped: operations.length, exercisesUpdated: 0 };
    }

    const days = await getPrescriptionWeekRows(client, programId, targetWeek);
    const plan = planWeekSetUpdates(days, operations, targetWeek - 1);

    for (const update of plan.updates) {
        // Generated row types flatten `reps_range` to number[] and forbid null
        // cells; round-tripping through JSON keeps one honest boundary cast.
        const payload = JSON.parse(JSON.stringify(update.patch)) as TExerciseUpdate;

        const { data, error } = await client
            .from("program_workout_exercises")
            .update(payload)
            .eq("id", update.exerciseId)
            .select("id");

        if (error) {
            throw error;
        }

        // An UPDATE that RLS filters out changes zero rows and raises no error.
        // Selecting the row back is the only way to tell "wrote it" from
        // "silently dropped it" — never report an unwritten change as applied.
        if (!data || data.length === 0) {
            throw new Error(
                `Prescription exercise ${update.exerciseId} was not updated (row missing or not writable)`,
            );
        }
    }

    return {
        applied: plan.applied,
        skipped: plan.skipped,
        exercisesUpdated: plan.updates.length,
    };
}
