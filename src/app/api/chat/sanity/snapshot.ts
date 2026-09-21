/**
 * @module chat/sanity/snapshot
 *
 * Builds the compact Program sanity check result (ADR 0025 / 02, C6) after a
 * batch has a concrete program to judge. Callers pass the program *before* and
 * *after* apply. This module does not read `hevyProgram` from the request and
 * does not call `readProgram` (that snapshot is stale after same-turn `buildProgram`).
 *
 * After `buildProgram`, the caller plates week 1 (`plateWeek1Across`) then
 * applies the Periodization wave (`plateThenStamp`) before same-turn
 * `mutateProgram`. Live-grid mutate passes the request-start program as both
 * before and the `applyOperations` result as after.
 *
 * The returned object is numbers and profiles only. It is safe to hand to Jev
 * in slice 3 without leftover `reason` text or full set objects.
 * {@link compactSnapshotForEvaluate} / {@link snapshotForStandaloneEvaluate}
 * trim plated clones before the Jev call. {@link uniqueExerciseTitles} is the
 * title set for injury / equipment pair questions (ADR 0030 / 02).
 *
 * Depends on: ./types, ./week-coverage, ./stamp, mutations/apply
 * Used by: tools.ts, route.ts, helpers.ts, questions.ts
 */

import { applyOperations } from "@/components/program-builder/mutations/apply";
import { isApplyBatchFailure } from "@/components/program-builder/mutations/types";
import type { TConstraintProfile } from "../constraints/types";
import type { TPeriodizationWave } from "./periodization-wave";
import {
    compilePeriodizationStamp,
    type TStampCompileFailure,
} from "./stamp";
import {
    dayExerciseStimuli,
    dayMatchesWeek1Stimulus,
    planWeekIntents,
    stimuliMatch,
} from "./week-coverage";
import type {
    TDayRef,
    TExerciseRoleAssignment,
    TProgramPlan,
    TProgramSanitySnapshot,
} from "./types";

/**
 * Coerce builder `programLength` (string or number) to a whole week count.
 * Non-finite, empty, and values below 1 are treated as missing.
 *
 * @param value - Request-body / `getTools` `programLength`
 * @returns Floor of the number, or undefined when the caller should use another source
 */
export function parseWeekCount(value: string | number | null | undefined): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
        return Math.floor(value);
    }
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed) && parsed >= 1) {
            return Math.floor(parsed);
        }
    }
    return undefined;
}

/**
 * How many weeks to duplicate week 1 across. Same precedence as the client's
 * atomic commit: plan `durationWeeks`, then UI `programLength`, then 1.
 *
 * @param plan - Plan from this turn's `buildProgram`, if any
 * @param programLength - Builder length from the request body
 */
export function resolvePlateWeekCount(
    plan: TProgramPlan | null | undefined,
    programLength: string | number | null | undefined,
): number {
    return Math.max(1, plan?.durationWeeks ?? parseWeekCount(programLength) ?? 1);
}

/**
 * Copy week-1 routines into folders `0 .. weekCount-1`. Exercises and sets are
 * cloned so later `applyOperations` cannot mutate week 1 through shared refs.
 *
 * This is the server copy of `buildFullProgramFromFirstWeek`. It lives here so
 * chat tools never import `program-builder/utils/helpers.ts` (client + sonner).
 *
 * @param week1 - Successful `buildProgram` routines (`folder_id` 0)
 * @param weekCount - From {@link resolvePlateWeekCount}; values below 1 become 1
 */
export function plateWeek1Across(week1: THevyRoutine[], weekCount: number): THevyRoutine[] {
    const sorted = [...week1].sort((a, b) => Number(a.order) - Number(b.order));
    const weeks = Math.max(1, weekCount);
    const full: THevyRoutine[] = [];
    let routineId = 1;
    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        for (const routine of sorted) {
            full.push({
                ...routine,
                id: String(routineId++),
                folder_id: weekIndex,
                exercises: (routine.exercises ?? []).map((exercise) => ({
                    ...exercise,
                    sets: (exercise.sets ?? []).map((set) => ({ ...set })),
                })),
            });
        }
    }
    return full;
}

export type TPlateThenStampResult =
    | { ok: true; program: THevyRoutine[] }
    | TStampCompileFailure;

/**
 * Plate week 1 across `weekCount`, then apply compiled Periodization stamp ops.
 * Compile Soft-fail does not return a plated clone.
 *
 * @param week1 - Successful `buildProgram` routines (`folder_id` 0)
 * @param wave - Stashed Periodization wave
 * @param roles - Stashed Exercise role assignments
 * @param weekCount - Program length in weeks
 */
export function plateThenStamp(
    week1: THevyRoutine[],
    wave: TPeriodizationWave | null | undefined,
    roles: TExerciseRoleAssignment[] | null | undefined,
    weekCount: number,
): TPlateThenStampResult {
    const compiled = compilePeriodizationStamp(week1, wave, roles, weekCount);
    if (!compiled.ok) return compiled;
    const plated = plateWeek1Across(week1, weekCount);
    if (compiled.operations.length === 0) {
        return { ok: true, program: plated };
    }
    const applied = applyOperations(plated, compiled.operations);
    if (isApplyBatchFailure(applied)) {
        return {
            ok: false,
            error: "periodizationStamp.apply",
            message: applied.failures[0]?.reason ?? "Periodization stamp apply failed.",
        };
    }
    return { ok: true, program: applied.program };
}

/**
 * User-visible text on one chat message. Accepts both UIMessage `parts`
 * (`type: "text"`) and older `{ content: string }` shapes. Non-user roles
 * and messages with no text yield `""`.
 *
 * @param message - One element of the request `messages` array
 */
function userTextFromMessage(message: unknown): string {
    if (message == null || typeof message !== "object") return "";
    const record = message as {
        role?: unknown;
        content?: unknown;
        parts?: unknown;
    };
    if (record.role !== "user") return "";
    if (typeof record.content === "string" && record.content.trim()) {
        return record.content;
    }
    const parts = Array.isArray(record.parts)
        ? record.parts
        : Array.isArray(record.content)
            ? record.content
            : [];
    const texts = parts.flatMap((part) => {
        if (part == null || typeof part !== "object") return [];
        const typed = part as { type?: unknown; text?: unknown };
        if (typed.type !== "text" && typed.type !== "input_text") return [];
        return typeof typed.text === "string" && typed.text.trim() ? [typed.text] : [];
    });
    return texts.join("\n");
}

/**
 * This turn's last user text for the snapshot `userMessage` field.
 * `getTools` does not receive `messages`; the route extracts it here.
 *
 * @param messages - Chat request `messages` (UIMessage[] or unknown)
 * @returns Joined text from the last user turn, or `""` if none
 */
export function readLastUserMessage(messages: unknown): string {
    if (!Array.isArray(messages)) return "";
    for (let index = messages.length - 1; index >= 0; index--) {
        const text = userTextFromMessage(messages[index]);
        if (text) return text;
    }
    return "";
}

function dayKey(folderId: number, order: number): string {
    return `${folderId}:${order}`;
}

function routineDayRef(routine: THevyRoutine): TDayRef {
    return {
        week: (routine.folder_id ?? 0) + 1,
        day: Number(routine.order),
    };
}

/**
 * Days on `afterProgram` that are new or whose title / stimulus moved versus
 * the same `folder_id` + `order` on `beforeProgram`. Used as snapshot `changedDays`.
 *
 * @param beforeProgram - Plate or live grid immediately before this batch
 * @param afterProgram - `applyOperations` result
 */
function changedDaysAfterApply(
    beforeProgram: THevyRoutine[],
    afterProgram: THevyRoutine[],
): TDayRef[] {
    const beforeByKey = new Map<string, THevyRoutine>();
    for (const routine of beforeProgram) {
        beforeByKey.set(dayKey(routine.folder_id ?? 0, Number(routine.order)), routine);
    }
    const changed: TDayRef[] = [];
    for (const routine of afterProgram) {
        const prior = beforeByKey.get(dayKey(routine.folder_id ?? 0, Number(routine.order)));
        if (!prior) {
            changed.push(routineDayRef(routine));
            continue;
        }
        const titleChanged = prior.title !== routine.title;
        const stimulusChanged = !stimuliMatch(
            dayExerciseStimuli(prior),
            dayExerciseStimuli(routine),
        );
        if (titleChanged || stimulusChanged) {
            changed.push(routineDayRef(routine));
        }
    }
    return changed;
}

/**
 * Compact result for one successful apply. Strips the grid down to C6 fields
 * and stamps `matchesWeek1Stimulus` on each later-week day so slice 3 does
 * not have to count.
 *
 * @param input.userMessage - Last user text this turn (`""` if the route found none)
 * @param input.constraintProfile - In-request Constraint profile, or omitted
 * @param input.trainingProfile - In-request Training profile, or omitted
 * @param input.plan - Plan from `buildProgram`, or omitted when this turn has none
 * @param input.beforeProgram - Program the batch applied to (plate or live grid)
 * @param input.afterProgram - Program after `applyOperations`
 */
export function buildSanitySnapshot(input: {
    userMessage: string;
    constraintProfile?: TConstraintProfile | null;
    trainingProfile?: TTrainingProfile | null;
    plan?: TProgramPlan | null;
    beforeProgram: THevyRoutine[];
    afterProgram: THevyRoutine[];
}): TProgramSanitySnapshot {
    const week1ByDay = new Map<number, THevyRoutine>();
    for (const routine of input.afterProgram) {
        if ((routine.folder_id ?? 0) === 0) {
            week1ByDay.set(Number(routine.order), routine);
        }
    }

    const matrix = [...input.afterProgram]
        .sort((a, b) => {
            const weekCmp = (a.folder_id ?? 0) - (b.folder_id ?? 0);
            return weekCmp !== 0 ? weekCmp : Number(a.order) - Number(b.order);
        })
        .map((routine) => {
            const week = (routine.folder_id ?? 0) + 1;
            const day = Number(routine.order);
            const matchesWeek1Stimulus =
                week > 1 && dayMatchesWeek1Stimulus(routine, week1ByDay.get(day));
            return {
                week,
                day,
                title: routine.title,
                exercises: dayExerciseStimuli(routine),
                matchesWeek1Stimulus,
            };
        });

    return {
        userMessage: input.userMessage,
        constraintProfile: input.constraintProfile ?? null,
        trainingProfile: input.trainingProfile ?? null,
        weekIntents: planWeekIntents(input.plan),
        changedDays: changedDaysAfterApply(input.beforeProgram, input.afterProgram),
        matchingWeek1Days: matrix
            .filter((row) => row.matchesWeek1Stimulus)
            .map((row) => ({ week: row.week, day: row.day })),
        matrix,
    };
}

function dayRefKey(day: TDayRef): string {
    return `${day.week}:${day.day}`;
}

/**
 * Drop later-week clones this batch did not touch. Jev 1.13 loses accuracy
 * on leftover plated weeks (C6). Week 1, changed later days, and later days
 * that already differ from week 1 stay.
 *
 * @param snapshot - Full compact result from {@link buildSanitySnapshot}
 */
export function compactSnapshotForEvaluate(snapshot: TProgramSanitySnapshot): TProgramSanitySnapshot {
    const changed = new Set(snapshot.changedDays.map(dayRefKey));
    return {
        ...snapshot,
        matrix: snapshot.matrix.filter((row) => {
            if (row.week === 1) return true;
            if (changed.has(dayRefKey(row))) return true;
            return !row.matchesWeek1Stimulus;
        }),
    };
}

/**
 * Standalone later mutation: Jev only sees days this batch changed, so
 * pre-existing honor gaps on untouched days cannot reject the batch.
 *
 * @param snapshot - Full compact result from {@link buildSanitySnapshot}
 */
export function snapshotForStandaloneEvaluate(snapshot: TProgramSanitySnapshot): TProgramSanitySnapshot {
    const changed = new Set(snapshot.changedDays.map(dayRefKey));
    return {
        ...snapshot,
        matrix: snapshot.matrix.filter((row) => changed.has(dayRefKey(row))),
    };
}

/**
 * Distinct exercise titles on the matrix, first-seen order (ADR 0030 C4).
 * Plated repeats of the same title collapse to one. Block-boundary swaps on
 * later weeks add their own title. Pass `days` to limit to a **Case 2** delta.
 *
 * @param matrix - Full stamped matrix from {@link buildSanitySnapshot}
 * @param days - Optional 1-based days to read; omitted means every row
 * @returns Trimmed, non-empty titles, exact spelling of the first occurrence
 */
export function uniqueExerciseTitles(
    matrix: TProgramSanitySnapshot["matrix"],
    days?: TDayRef[],
): string[] {
    const only = days ? new Set(days.map(dayRefKey)) : null;
    const titles: string[] = [];
    const seen = new Set<string>();
    for (const row of matrix) {
        if (only && !only.has(dayRefKey(row))) continue;
        for (const exercise of row.exercises) {
            const title = exercise.title?.trim();
            if (!title || seen.has(title)) continue;
            seen.add(title);
            titles.push(title);
        }
    }
    return titles;
}
