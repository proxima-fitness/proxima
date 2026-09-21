/**
 * @module chat/sanity/types
 *
 * Shared types for the **Program sanity check** compact snapshot (ADR 0025 / 02, C6)
 * and the week-coverage code gate (C2). This is the result shape slice 3 will send
 * to Jev. It is not the live program grid.
 *
 * Week and day numbers on these types are 1-based (week 1 = `folder_id` 0, day =
 * Hevy `order`). Stimulus is working-set count plus RPE min/max per exercise title.
 * Full set objects, `reason`, notes, ids, and `builder_exercise_key` do not appear.
 *
 * Depends on: TConstraintProfile
 * Used by: snapshot.ts, week-coverage.ts, stalemate.ts, tools.ts
 */

import type { TConstraintProfile } from "../constraints/types";

/**
 * One mesocycle block from `planProgram`. `weeks` are 1-based indices inside
 * `durationWeeks`. Coverage treats name + intent as the claim text.
 */
export type TPlanBlock = {
    name: string;
    weeks: number[];
    intent: string;
};

/**
 * Fields week coverage reads from a successful `planProgram` call. Extra
 * `planProgram` keys (progression table, notes) may exist at runtime and are ignored.
 */
export type TPlanProgram = {
    durationWeeks: number;
    daysPerWeek?: number;
    goal?: string;
    blocks: TPlanBlock[];
};

/** Constraint-profile array a **Program stalemate** chip names. */
export type TStalemateChipField = "injuries" | "excludedEquipment" | "excludedAreas";

/** Exact saved Constraint profile string the user may remove. */
export type TProgramStalemateChip = {
    field: TStalemateChipField;
    value: string;
};

/**
 * Card kind. Constraint chips persist a saved row. Week-coverage sets the
 * same-week skip. Training / skill clicks are the next user message.
 */
export type TProgramStalemateKind = "constraint" | "weekCoverage" | "training";

/**
 * Payload the client card needs. Honor `key` is the counted Soft-fail id.
 * `chips` are exact stored strings, never paraphrases.
 */
export interface IProgramStalematePayload {
    chips: TProgramStalemateChip[];
    key: string;
    kind: TProgramStalemateKind;
    why: string;
}

/**
 * Mutable per-request bag, same lifetime as `IBuildWeekOnceGuard`.
 * `planProgram` and a successful `buildWeek` write here so same-turn
 * `mutateProgram` can plate week 1 and know which weeks were claimed.
 * Slice 1 (ADR 0027) also counts Soft-fail keys and the same-week skip.
 */
export interface IProgramSanityStash {
    plan: TPlanProgram | null;
    buildWeekRoutines: THevyRoutine[] | null;
    skipSameWeekCoverage?: boolean;
    softFailCounts?: Record<string, number>;
    stalemate?: IProgramStalematePayload | null;
    stalemateStopped?: boolean;
}

/** One 1-based week and the block that owns it. Later blocks win if a week is listed twice. */
export type TWeekIntent = {
    week: number;
    name: string;
    intent: string;
};

/**
 * One exercise on a day after warmup sets are dropped.
 * `rpeMin` / `rpeMax` are null when no remaining set has an RPE.
 */
export type TExerciseStimulus = {
    title: string;
    workingSetCount: number;
    rpeMin: number | null;
    rpeMax: number | null;
};

/** 1-based week and day (`order`). */
export type TDayRef = {
    week: number;
    day: number;
};

/**
 * One plated day in the compact matrix.
 * `matchesWeek1Stimulus` is always false on week 1. On later weeks it is true
 * when this day's exercise titles, working-set counts, and RPE bounds equal
 * week 1's day with the same `order`.
 */
export type TDayMatrixRow = {
    week: number;
    day: number;
    title: string;
    exercises: TExerciseStimulus[];
    matchesWeek1Stimulus: boolean;
};

/**
 * Compact delta for one `buildWeek` / `mutateProgram` success path.
 * `changedDays` are days whose title or stimulus moved during this apply.
 * `matchingWeek1Days` are later-week days that still match week 1 stimulus.
 */
export type TProgramSanitySnapshot = {
    userMessage: string;
    constraintProfile: TConstraintProfile | null;
    trainingProfile: TTrainingProfile | null;
    weekIntents: TWeekIntent[];
    changedDays: TDayRef[];
    matchingWeek1Days: TDayRef[];
    matrix: TDayMatrixRow[];
};

/** One claimed week-day that is still a week-1 clone on set count and RPE. */
export type TWeekCoverageMiss = {
    week: number;
    day: number;
};

/**
 * Code-gate result. `ok: false` is a Soft tool failure; the client must not
 * land the batch. `misses` is empty when `ok` is true.
 */
export type TWeekCoverageResult = {
    ok: boolean;
    misses: TWeekCoverageMiss[];
};
