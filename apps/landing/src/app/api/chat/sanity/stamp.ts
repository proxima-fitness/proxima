/**
 * @module chat/sanity/stamp
 *
 * Compiles a stashed Periodization wave + Exercise roles into mutation
 * registry ops (ADR 0027 / 03, C2; ADR 0029 / 01). Deltas are week1+delta
 * (set), floored at 1 working set. Warmup rows and warmup sets are not
 * stamped. weight_kg is never invented.
 *
 * Depends on: ./periodization-wave, ./types, mutations/agentSchema
 * Used by: snapshot.ts plateThenStamp, tools.ts buildProgram, helpers.ts commit
 */

import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import type { TInsertExercisePayload } from "@/components/program-builder/mutations/schemas";

import type { TPeriodizationWave } from "./periodization-wave";
import type { TExerciseRole, TExerciseRoleAssignment } from "./types";

export type TStampCompileFailure = {
    ok: false;
    error: string;
    message: string;
};

export type TStampCompileSuccess = {
    ok: true;
    operations: TAgentProgramOperation[];
};

export type TPeriodizationStampResult = TStampCompileSuccess | TStampCompileFailure;

type TWaveWeek = TPeriodizationWave["weeks"][number];
type TDelta = { rpeDelta: number; setCountDelta: number };

function fail(error: string, message: string): TStampCompileFailure {
    return { ok: false, error, message };
}

function isWorkingSet(set: THevySets): boolean {
    return set.type !== "warmup";
}

function clampRpe(rpe: number, delta: number): number {
    return Math.min(10, Math.max(1, rpe + delta));
}

function roleKey(dayOrder: number, exerciseIndex: number): string {
    return `${dayOrder}:${exerciseIndex}`;
}

function waveByWeek(wave: TPeriodizationWave): Map<number, TWaveWeek> {
    const rows = new Map<number, TWaveWeek>();
    for (const row of wave.weeks) {
        rows.set(row.week, row);
    }
    return rows;
}

function deltasForRole(row: TWaveWeek, role: TExerciseRole): TDelta | null {
    if (role === "warmup") return null;
    if (role === "main") return row.main;
    return row.accessory ?? null;
}

function workingSetsOf(exercise: THevyExercise): THevySets[] {
    return (exercise.sets ?? []).filter(isWorkingSet);
}

function warmupSetsOf(exercise: THevyExercise): THevySets[] {
    return (exercise.sets ?? []).filter((set) => !isWorkingSet(set));
}

function toPayloadSet(
    set: THevySets,
    index: number,
    rpe: number | null,
    repRange: THevyRepRange | null | undefined,
): TInsertExercisePayload["sets"][number] {
    const degenerate = repRange != null && repRange.start === repRange.end;
    return {
        index,
        type: set.type,
        weight_kg: set.weight_kg ?? null,
        reps: degenerate ? (set.reps ?? repRange.start) : (set.reps ?? null),
        distance_meters: set.distance_meters ?? null,
        duration_seconds: set.duration_seconds ?? null,
        rpe,
        custom_metric: set.custom_metric ?? null,
        rep_range: degenerate ? null : (repRange === undefined ? set.rep_range ?? null : repRange),
    };
}

function paddedWorkingSets(working: THevySets[], targetCount: number): THevySets[] {
    const out: THevySets[] = [];
    const last = working[working.length - 1];
    for (let i = 0; i < targetCount; i++) {
        const source = working[i] ?? last;
        if (source) out.push(source);
    }
    return out;
}

function rpeForSet(set: THevySets, delta: number): number | null {
    if (set.rpe == null || !Number.isFinite(set.rpe)) return set.rpe ?? null;
    return clampRpe(set.rpe, delta);
}

/**
 * Compile week-1 + wave into `update_set` / `edit_exercise` ops for weeks 2..N.
 * Does not read later-week cells. Does not emit `add_set` or `edit_day_title`.
 *
 * @param week1 - Successful `buildProgram` routines (`folder_id` 0)
 * @param wave - Stashed Periodization wave
 * @param roles - Stashed Exercise role assignments (day 1-based, index 0-based)
 * @param weekCount - Program length in weeks
 */
export function compilePeriodizationStamp(
    week1: THevyRoutine[],
    wave: TPeriodizationWave | null | undefined,
    roles: TExerciseRoleAssignment[] | null | undefined,
    weekCount: number,
): TPeriodizationStampResult {
    if (wave == null || !Array.isArray(wave.weeks) || wave.weeks.length === 0) {
        return fail(
            "periodizationStamp.missingWave",
            "Periodization wave is missing. Call buildProgram with a periodizationWave.",
        );
    }
    if (!Array.isArray(roles) || roles.length === 0) {
        return fail(
            "periodizationStamp.missingRoles",
            "Exercise roles are missing. Tag every week-1 row main, accessory, or warmup.",
        );
    }

    const roleByKey = new Map<string, TExerciseRole>();
    for (const assignment of roles) {
        roleByKey.set(roleKey(assignment.dayOrder, assignment.exerciseIndex), assignment.role);
    }

    let hasMain = false;
    for (const day of week1) {
        const dayOrder = Number(day.order);
        const exercises = day.exercises ?? [];
        for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
            const role = roleByKey.get(roleKey(dayOrder, exerciseIndex));
            if (role == null) {
                return fail(
                    "periodizationStamp.missingRoles",
                    `Exercise role missing for day ${dayOrder}, exercise ${exerciseIndex}.`,
                );
            }
            if (role === "main") hasMain = true;
        }
    }
    if (!hasMain) {
        return fail(
            "periodizationStamp.emptyMains",
            "Week 1 needs at least one main. The Periodization wave has nothing to stamp.",
        );
    }

    const weeks = Math.max(1, weekCount);
    const rows = waveByWeek(wave);
    const operations: TAgentProgramOperation[] = [];

    for (let w = 2; w <= weeks; w++) {
        const row = rows.get(w);
        if (!row) continue;
        const folderIds = [w - 1];

        for (const day of week1) {
            const dayOrder = Number(day.order);
            const exercises = day.exercises ?? [];
            for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
                const exercise = exercises[exerciseIndex];
                const role = roleByKey.get(roleKey(dayOrder, exerciseIndex));
                if (role == null) continue;
                const delta = deltasForRole(row, role);
                if (delta == null) continue;

                const applyRepRange = role === "main" && row.mainRepRange != null;
                const noOp =
                    delta.setCountDelta === 0 && delta.rpeDelta === 0 && !applyRepRange;
                if (noOp) continue;

                const warmups = warmupSetsOf(exercise);
                const working = workingSetsOf(exercise);
                const targetCount = Math.max(1, working.length + delta.setCountDelta);
                const range = applyRepRange ? row.mainRepRange : undefined;

                if (delta.setCountDelta !== 0) {
                    const nextWorking = paddedWorkingSets(working, targetCount);
                    const sets = [
                        ...warmups.map((set, index) => toPayloadSet(set, index, set.rpe ?? null, undefined)),
                        ...nextWorking.map((set, index) =>
                            toPayloadSet(
                                set,
                                warmups.length + index,
                                rpeForSet(set, delta.rpeDelta),
                                range,
                            ),
                        ),
                    ];
                    const payload: TInsertExercisePayload = {
                        exercise_template_id: exercise.exercise_template_id,
                        title: exercise.title,
                        notes: exercise.notes,
                        rest_seconds: exercise.rest_seconds,
                        supersets_id: exercise.supersets_id,
                        sets,
                        ...(exercise.reason !== undefined ? { reason: exercise.reason } : {}),
                    };
                    operations.push({
                        op: "edit_exercise",
                        folderIds,
                        dayOrder,
                        exerciseIndex,
                        exercise: payload,
                    });
                }

                const postWorkingCount =
                    delta.setCountDelta !== 0 ? targetCount : working.length;
                const postWorking = paddedWorkingSets(working, postWorkingCount);
                for (let i = 0; i < postWorking.length; i++) {
                    const source = postWorking[i];
                    const setIndex = warmups.length + i;
                    const nextRpe = rpeForSet(source, delta.rpeDelta);
                    const patch: {
                        rpe?: number;
                        rep_range?: THevyRepRange | null;
                        reps?: number | null;
                    } = {};
                    if (delta.rpeDelta !== 0 && nextRpe != null) {
                        patch.rpe = nextRpe;
                    }
                    if (applyRepRange && range != null) {
                        if (range.start === range.end) {
                            patch.rep_range = null;
                            patch.reps = source.reps ?? range.start;
                        } else {
                            patch.rep_range = { start: range.start, end: range.end };
                        }
                    }
                    if (Object.keys(patch).length === 0) continue;
                    operations.push({
                        op: "update_set",
                        folderIds,
                        dayOrder,
                        exerciseIndex,
                        setIndex,
                        set: patch,
                    });
                }
            }
        }
    }

    return { ok: true, operations };
}
