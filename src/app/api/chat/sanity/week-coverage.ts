/**
 * @module chat/sanity/week-coverage
 *
 * Code half of Program sanity check C2 (ADR 0025 / 02, amended by ADR 0027 / 04).
 * Two paths, both comparing working-set count and RPE min/max per exercise title:
 *
 * - **First build** ({@link evaluateFirstBuildWeekCoverage}): on the stamped
 *   program, any later-week day whose `main` rows still match week 1 is a miss.
 * - **Case 2** ({@link evaluateWeekCoverage}): after a `mutateProgram` batch,
 *   only *claimed* later weeks are checked. A claim is a plan block whose name
 *   or intent matches deload / peak / easy / taper (or unload / recovery), or
 *   `deloadWeek === "yes"` when the plan has no such block (last week).
 *
 * Both pass when the **Program stalemate** same-week skip is set. This module
 * does not judge whether a numeric change is "enough" of a deload. That is
 * Jev (`constraint.deloadHonor`).
 *
 * Depends on: ./types
 * Used by: snapshot.ts, tools.ts
 */

import type {
    TDayMatrixRow,
    TExerciseRoleAssignment,
    TExerciseStimulus,
    TProgramPlan,
    TProgramSanitySnapshot,
    TWeekCoverageMiss,
    TWeekCoverageResult,
    TWeekIntent,
} from "./types";

/** Block name/intent tokens that mark a week as claimed (deload / peak / easy). */
const CLAIMED_WEEK_RE = /\b(deload|unload|taper|peak|easy|recovery)\b/i;

function isWorkingSet(set: THevySets): boolean {
    return (set.type || "normal") !== "warmup";
}

function rpeBounds(sets: THevySets[]): { rpeMin: number | null; rpeMax: number | null } {
    let rpeMin: number | null = null;
    let rpeMax: number | null = null;
    for (const set of sets) {
        if (set.rpe == null) continue;
        if (rpeMin == null || set.rpe < rpeMin) rpeMin = set.rpe;
        if (rpeMax == null || set.rpe > rpeMax) rpeMax = set.rpe;
    }
    return { rpeMin, rpeMax };
}

/**
 * Working-set count and RPE bounds for each exercise on a day, in array order.
 * Warmup-typed sets are omitted. Missing `exercises` / `sets` become empty lists.
 *
 * @param day - One routine. `title` on each exercise is the match key later.
 */
export function dayExerciseStimuli(day: THevyRoutine): TExerciseStimulus[] {
    return (day.exercises ?? []).map((exercise) => {
        const working = (exercise.sets ?? []).filter(isWorkingSet);
        return {
            title: exercise.title,
            workingSetCount: working.length,
            ...rpeBounds(working),
        };
    });
}

function byTitleThenIndex(a: TExerciseStimulus, b: TExerciseStimulus): number {
    const titleCmp = a.title.localeCompare(b.title);
    return titleCmp !== 0 ? titleCmp : 0;
}

/**
 * True when both days have the same exercise titles with the same working-set
 * counts and RPE bounds. Order is ignored. Length mismatch is a miss.
 *
 * @param a - Stimulus rows from one day
 * @param b - Stimulus rows from the other day
 */
export function stimuliMatch(a: TExerciseStimulus[], b: TExerciseStimulus[]): boolean {
    if (a.length !== b.length) return false;
    const left = [...a].sort(byTitleThenIndex);
    const right = [...b].sort(byTitleThenIndex);
    return left.every((row, index) => {
        const other = right[index];
        return (
            row.title === other.title &&
            row.workingSetCount === other.workingSetCount &&
            row.rpeMin === other.rpeMin &&
            row.rpeMax === other.rpeMax
        );
    });
}

/**
 * True when `day` matches `week1Day` on {@link stimuliMatch}.
 * False when week 1 has no day with that `order` (not a clone).
 *
 * @param day - Later-week routine
 * @param week1Day - Same `order` on folder 0, or undefined if that slot is missing
 */
export function dayMatchesWeek1Stimulus(
    day: THevyRoutine,
    week1Day: THevyRoutine | undefined,
): boolean {
    if (!week1Day) return false;
    return stimuliMatch(dayExerciseStimuli(day), dayExerciseStimuli(week1Day));
}

/**
 * One intent per 1-based week from `plan.blocks`. Empty plan or empty blocks
 * yield `[]`. If two blocks list the same week, the later block wins.
 *
 * @param plan - Plan from this turn's `buildProgram`, or null when there is none
 */
export function planWeekIntents(plan: TProgramPlan | null | undefined): TWeekIntent[] {
    if (!plan?.blocks?.length) return [];
    const byWeek = new Map<number, TWeekIntent>();
    for (const block of plan.blocks) {
        for (const week of block.weeks) {
            byWeek.set(week, { week, name: block.name, intent: block.intent });
        }
    }
    return [...byWeek.values()].sort((a, b) => a.week - b.week);
}

function isClaimedIntent(intent: TWeekIntent): boolean {
    return CLAIMED_WEEK_RE.test(`${intent.name} ${intent.intent}`);
}

/**
 * 1-based weeks that must differ from week 1 after apply.
 *
 * Plan blocks whose name or intent matches deload / peak / easy / taper win.
 * If none match and `deloadWeek === "yes"`, `lastWeek` is the claimed deload
 * (the questionnaire "easier week at the end" default). Week 1 is never returned.
 *
 * @param weekIntents - From {@link planWeekIntents}; may be empty
 * @param deloadWeek - Constraint profile preference id (`"yes"` / `"no"` / `""`)
 * @param lastWeek - Highest 1-based week on the plated program
 * @returns Sorted unique week numbers, or `[]` when coverage should not run
 */
export function claimedWeekNumbers(
    weekIntents: TWeekIntent[],
    deloadWeek: string | undefined,
    lastWeek: number,
): number[] {
    const fromPlan = weekIntents
        .filter((intent) => intent.week > 1 && isClaimedIntent(intent))
        .map((intent) => intent.week);
    if (fromPlan.length > 0) {
        return [...new Set(fromPlan)].sort((a, b) => a - b);
    }
    if (deloadWeek === "yes" && lastWeek > 1) {
        return [lastWeek];
    }
    return [];
}

/**
 * Highest 1-based week in the matrix. Empty matrix is treated as week 1 so a
 * first `buildProgram` cannot invent a later claimed week.
 *
 * @param matrix - Compact day rows from the snapshot matrix
 */
export function lastWeekFromMatrix(matrix: TDayMatrixRow[]): number {
    return matrix.reduce((max, row) => Math.max(max, row.week), 1);
}

/**
 * Soft-fail when any claimed week-day still has `matchesWeek1Stimulus`.
 * No claimed weeks (live-grid tweak, or no deload/peak/easy plan) is a pass.
 * A **Program stalemate** same-week skip this First build is a pass.
 *
 * @param snapshot - Compact result after this batch applied
 * @param deloadWeek - Constraint profile `preferences.deloadWeek`
 * @param skipSameWeekCoverage - Stash flag from the stalemate same-week click
 */
export function evaluateWeekCoverage(
    snapshot: TProgramSanitySnapshot,
    deloadWeek: string | undefined,
    skipSameWeekCoverage = false,
): TWeekCoverageResult {
    if (skipSameWeekCoverage) {
        return { ok: true, misses: [] };
    }
    const lastWeek = lastWeekFromMatrix(snapshot.matrix);
    const claimed = new Set(claimedWeekNumbers(snapshot.weekIntents, deloadWeek, lastWeek));
    if (claimed.size === 0) {
        return { ok: true, misses: [] };
    }
    const misses = snapshot.matrix
        .filter((row) => claimed.has(row.week) && row.matchesWeek1Stimulus)
        .map((row) => ({ week: row.week, day: row.day }));
    return { ok: misses.length === 0, misses };
}

/**
 * One labeled line per miss for the Soft tool failure `message`.
 * `toModelOutput` already forwards `message` unchanged.
 *
 * @param misses - Claimed days that still match week 1
 */
export function formatWeekCoverageMessage(misses: Array<{ week: number; day: number }>): string {
    return misses
        .map((miss) => `weekCoverage: week ${miss.week} day ${miss.day} matches week 1 set count and RPE`)
        .join("\n");
}

/** 0-based exercise indexes tagged `main`, keyed by 1-based day order. */
function mainIndexesByDay(roles: TExerciseRoleAssignment[]): Map<number, Set<number>> {
    const byDay = new Map<number, Set<number>>();
    for (const assignment of roles) {
        if (assignment.role !== "main") continue;
        const indexes = byDay.get(assignment.dayOrder) ?? new Set<number>();
        indexes.add(assignment.exerciseIndex);
        byDay.set(assignment.dayOrder, indexes);
    }
    return byDay;
}

function mainStimuli(day: THevyRoutine, mainIndexes: Set<number>): TExerciseStimulus[] {
    return dayExerciseStimuli(day).filter((_, index) => mainIndexes.has(index));
}

/**
 * **First build** week-coverage (ADR 0027 / 04, C1). On the plated + stamped
 * program, every later-week day whose **Exercise role** `main` rows still match
 * week 1 on working-set count and RPE min/max (by title) is a miss, claimed
 * week or not. Accessories and warmup rows are ignored. Days with no main are
 * not judged. Only the **Program stalemate** same-week skip passes clones;
 * empty **Questionnaire advanced** is not a skip.
 *
 * Case 2 (`mutateProgram`) keeps {@link evaluateWeekCoverage}.
 *
 * @param program - `plateThenStamp` result (all weeks)
 * @param roles - Stashed week-1 Exercise roles (positions are stable through the stamp)
 * @param skipSameWeekCoverage - Stash flag from the stalemate same-week click
 */
export function evaluateFirstBuildWeekCoverage(
    program: THevyRoutine[],
    roles: TExerciseRoleAssignment[],
    skipSameWeekCoverage = false,
): TWeekCoverageResult {
    if (skipSameWeekCoverage) {
        return { ok: true, misses: [] };
    }
    const mainsByDay = mainIndexesByDay(roles);
    const week1ByDay = new Map<number, THevyRoutine>();
    for (const routine of program) {
        if ((routine.folder_id ?? 0) === 0) {
            week1ByDay.set(Number(routine.order), routine);
        }
    }
    const misses = program
        .filter((routine) => (routine.folder_id ?? 0) > 0)
        .flatMap((routine) => {
            const day = Number(routine.order);
            const mainIndexes = mainsByDay.get(day);
            const week1Day = week1ByDay.get(day);
            if (!mainIndexes?.size || !week1Day) return [];
            const clone = stimuliMatch(
                mainStimuli(routine, mainIndexes),
                mainStimuli(week1Day, mainIndexes),
            );
            return clone ? [{ week: (routine.folder_id ?? 0) + 1, day }] : [];
        })
        .sort((a, b) => a.week - b.week || a.day - b.day);
    return { ok: misses.length === 0, misses };
}

/**
 * {@link evaluateFirstBuildWeekCoverage} misses as Soft-fail lines. Same
 * `weekCoverage:` prefix so **Program stalemate** counting is unchanged.
 *
 * @param misses - Later-week days whose mains still match week 1
 */
export function formatFirstBuildWeekCoverageMessage(misses: TWeekCoverageMiss[]): string {
    return misses
        .map((miss) => `weekCoverage: week ${miss.week} day ${miss.day} mains match week 1 set count and RPE`)
        .join("\n");
}
