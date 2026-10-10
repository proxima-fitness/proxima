// SPDX-License-Identifier: AGPL-3.0-only

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
 * Both pass when the **Program stalemate** same-week skip is set.
 *
 * **First build** phase hardness ({@link evaluateFirstBuildPhaseHardness},
 * ADR 0032 / 02, C2–C3): a claimed deload-class **Mesocycle block** week must
 * have easier mains than the week before the claim, and a claimed peak must
 * have harder mains. Code owns this; Jev is not asked `deloadHonor` / `peakHonor`.
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

/** Phase a **Mesocycle block** claims for a week. `deload` covers unload / taper / recovery / easy. */
export type TClaimedPhase = "deload" | "peak";

/** Stamp clamps RPE here, so a peak cannot climb past a baseline already at it. */
const MAX_RPE = 10;

/** Deload-class and peak tokens. The first token in the text decides the phase. */
const PHASE_TOKEN_RE = /\b(deload|unload|taper|recovery|easy|peak)\b/i;

/** One claimed week: the phase, and the words the Soft-fail uses for the claim. */
export type TPhaseClaim = {
    week: number;
    phase: TClaimedPhase;
    claim: string;
};

/**
 * One phase-hardness Soft-fail line. `notEasier` / `notHarder` compare mains
 * with `baselineWeek` on `days`. `missingPeak` is `peakWeek: yes` with no
 * block claiming a peak (`week` / `baselineWeek` are null, `days` empty).
 * `mainsLackRpe` is true when RPE could not be compared on some missed day;
 * `baselineAtRpeCap` when a missed peak day's baseline mains are already RPE 10.
 */
export type TPhaseHardnessMiss = {
    kind: "notEasier" | "notHarder" | "missingPeak";
    phase: TClaimedPhase;
    week: number | null;
    claim: string;
    baselineWeek: number | null;
    days: number[];
    mainsLackRpe: boolean;
    baselineAtRpeCap: boolean;
};

/** Code-gate result. `error` is the counted Soft-fail id of the first miss. */
export type TPhaseHardnessResult =
    | { ok: true; misses: [] }
    | { ok: false; error: string; misses: TPhaseHardnessMiss[] };

/** Constraint profile preferences the phase claims read. */
type TPhasePreferences = {
    deloadWeek?: string;
    peakWeek?: string;
};

function phaseFromText(text: string): TClaimedPhase | null {
    const match = PHASE_TOKEN_RE.exec(text);
    if (!match) return null;
    return match[1].toLowerCase() === "peak" ? "peak" : "deload";
}

/**
 * Block name decides; intent is read only when the name names no phase, so a
 * "Deload" block whose intent says "recover from the peak" stays a deload.
 */
function phaseForIntent(intent: TWeekIntent): TClaimedPhase | null {
    return phaseFromText(intent.name) ?? phaseFromText(intent.intent);
}

/**
 * Claimed deload-class and peak weeks after week 1. **Mesocycle block** claims
 * win. When no block claims a deload and `deloadWeek === "yes"`, the last week
 * is the claimed deload (same convention as {@link claimedWeekNumbers}) unless
 * a block already claims it. `peakWeek === "yes"` never invents a week: the
 * blocks must claim the peak ({@link evaluateFirstBuildPhaseHardness} Soft-fails
 * `missingPeak` otherwise).
 *
 * @param weekIntents - From {@link planWeekIntents}
 * @param preferences - Constraint profile preferences, if any
 * @param lastWeek - Highest 1-based week on the stamped program
 */
export function claimedPhaseWeeks(
    weekIntents: TWeekIntent[],
    preferences: TPhasePreferences | undefined,
    lastWeek: number,
): TPhaseClaim[] {
    const claims: TPhaseClaim[] = [];
    for (const intent of weekIntents) {
        if (intent.week <= 1) continue;
        const phase = phaseForIntent(intent);
        if (phase) claims.push({ week: intent.week, phase, claim: `labeled ${intent.name}` });
    }
    const hasDeloadClaim = claims.some((claim) => claim.phase === "deload");
    const lastWeekClaimed = claims.some((claim) => claim.week === lastWeek);
    if (!hasDeloadClaim && !lastWeekClaimed && preferences?.deloadWeek === "yes" && lastWeek > 1) {
        claims.push({ week: lastWeek, phase: "deload", claim: "the deloadWeek: yes deload" });
    }
    return claims.sort((a, b) => a.week - b.week);
}

/**
 * The week a claim is judged against: the latest earlier week not claimed
 * with the same phase. A two-week deload block compares both weeks with the
 * week before the block, not week 2 of the deload with week 1 of it.
 */
function baselineWeekFor(claim: TPhaseClaim, claims: TPhaseClaim[]): number {
    const samePhase = new Set(
        claims.filter((other) => other.phase === claim.phase).map((other) => other.week),
    );
    let week = claim.week - 1;
    while (week > 1 && samePhase.has(week)) week -= 1;
    return week;
}

/** Total working sets and top RPE across a day's `main` rows. */
type TMainLoad = {
    sets: number;
    rpe: number | null;
};

function mainLoad(day: THevyRoutine, mainIndexes: Set<number>): TMainLoad {
    return mainStimuli(day, mainIndexes).reduce<TMainLoad>(
        (load, row) => ({
            sets: load.sets + row.workingSetCount,
            rpe: row.rpeMax == null ? load.rpe : Math.max(load.rpe ?? row.rpeMax, row.rpeMax),
        }),
        { sets: 0, rpe: null },
    );
}

/** -1 / 0 / 1 when top main RPE went down / held / went up; 0 when either side has none. */
function rpeDirection(current: TMainLoad, baseline: TMainLoad): number {
    if (current.rpe == null || baseline.rpe == null) return 0;
    return Math.sign(current.rpe - baseline.rpe);
}

/**
 * Deload-class: fewer sets or lower RPE, and neither goes up. A set count
 * floored at 1 (ADR 0029) still passes on lower RPE.
 */
function isEasier(current: TMainLoad, baseline: TMainLoad): boolean {
    const rpe = rpeDirection(current, baseline);
    return (current.sets < baseline.sets || rpe < 0) && current.sets <= baseline.sets && rpe <= 0;
}

/**
 * Peak: higher RPE (an intensity peak may cut sets), or more sets without a
 * lower RPE.
 */
function isHarder(current: TMainLoad, baseline: TMainLoad): boolean {
    const rpe = rpeDirection(current, baseline);
    return rpe > 0 || (current.sets > baseline.sets && rpe === 0);
}

/**
 * Soft-fail id for a phase-hardness miss. Counted toward a **Program
 * stalemate** like any honor id.
 *
 * @param phase - Claimed phase that missed
 */
export function phaseHardnessErrorId(phase: TClaimedPhase): string {
    return `phaseHardness.${phase}`;
}

/**
 * **First build** deload / peak hardness (ADR 0032 C2). On the stamped
 * program, every day with mains on a claimed week is compared with the same
 * `order` on its baseline week ({@link baselineWeekFor}). Deload-class must
 * be easier, peak must be harder, on **Exercise role** mains only
 * (accessories cannot satisfy it). `peakWeek === "yes"` with no peak claim is
 * a miss. The **Program stalemate** same-week skip passes, like week-coverage.
 *
 * @param program - `plateThenStamp` result (all weeks)
 * @param roles - Stashed week-1 Exercise roles
 * @param weekIntents - From {@link planWeekIntents} on this call's plan
 * @param preferences - Constraint profile preferences, if any
 * @param skipSameWeekCoverage - Stash flag from the stalemate same-week click
 */
export function evaluateFirstBuildPhaseHardness(
    program: THevyRoutine[],
    roles: TExerciseRoleAssignment[],
    weekIntents: TWeekIntent[],
    preferences: TPhasePreferences | undefined,
    skipSameWeekCoverage = false,
): TPhaseHardnessResult {
    if (skipSameWeekCoverage) return { ok: true, misses: [] };

    const lastWeek = program.reduce((max, routine) => Math.max(max, (routine.folder_id ?? 0) + 1), 1);
    const claims = claimedPhaseWeeks(weekIntents, preferences, lastWeek);
    const mainsByDay = mainIndexesByDay(roles);
    const dayAt = new Map<string, THevyRoutine>();
    for (const routine of program) {
        dayAt.set(`${(routine.folder_id ?? 0) + 1}:${Number(routine.order)}`, routine);
    }

    const misses: TPhaseHardnessMiss[] = [];
    if (preferences?.peakWeek === "yes" && lastWeek > 1 && !claims.some((claim) => claim.phase === "peak")) {
        misses.push({
            kind: "missingPeak",
            phase: "peak",
            week: null,
            claim: "peakWeek: yes",
            baselineWeek: null,
            days: [],
            mainsLackRpe: false,
            baselineAtRpeCap: false,
        });
    }

    for (const claim of claims) {
        const baselineWeek = baselineWeekFor(claim, claims);
        const days: number[] = [];
        let mainsLackRpe = false;
        let baselineAtRpeCap = false;
        for (const [day, mainIndexes] of mainsByDay) {
            const current = dayAt.get(`${claim.week}:${day}`);
            const baseline = dayAt.get(`${baselineWeek}:${day}`);
            if (!current || !baseline || mainIndexes.size === 0) continue;
            const currentLoad = mainLoad(current, mainIndexes);
            const baselineLoad = mainLoad(baseline, mainIndexes);
            const ok = claim.phase === "deload"
                ? isEasier(currentLoad, baselineLoad)
                : isHarder(currentLoad, baselineLoad);
            if (ok) continue;
            days.push(day);
            if (currentLoad.rpe == null || baselineLoad.rpe == null) mainsLackRpe = true;
            if (claim.phase === "peak" && (baselineLoad.rpe ?? 0) >= MAX_RPE) baselineAtRpeCap = true;
        }
        if (days.length === 0) continue;
        misses.push({
            kind: claim.phase === "deload" ? "notEasier" : "notHarder",
            phase: claim.phase,
            week: claim.week,
            claim: claim.claim,
            baselineWeek,
            days: days.sort((a, b) => a - b),
            mainsLackRpe,
            baselineAtRpeCap,
        });
    }

    if (misses.length === 0) return { ok: true, misses: [] };
    misses.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
    return { ok: false, error: phaseHardnessErrorId(misses[0].phase), misses };
}

function phaseHardnessLine(miss: TPhaseHardnessMiss): string {
    if (miss.kind === "missingPeak") {
        return "phaseHardness: peakWeek is yes but no Mesocycle block claims a Peak week — add a Peak block before the end and give its main rpeDelta and/or setCountDelta higher values than the week before it.";
    }
    const days = `day${miss.days.length > 1 ? "s" : ""} ${miss.days.join(", ")}`;
    const rpeNote = miss.mainsLackRpe
        ? " Those mains have no RPE, so rpeDelta cannot move them; change setCountDelta."
        : miss.baselineAtRpeCap
            ? ` Week ${miss.baselineWeek} mains are already RPE 10, so raise setCountDelta or lower week ${miss.baselineWeek}'s rpeDelta.`
            : "";
    if (miss.kind === "notHarder") {
        return `phaseHardness: week ${miss.week} is ${miss.claim} but mains are not harder than week ${miss.baselineWeek} (${days}) — raise week ${miss.week} main rpeDelta and/or setCountDelta above week ${miss.baselineWeek}'s row (do not copy the deload row).${rpeNote}`;
    }
    return `phaseHardness: week ${miss.week} is ${miss.claim} but mains are not easier than week ${miss.baselineWeek} (${days}) — lower week ${miss.week} main rpeDelta and/or setCountDelta below week ${miss.baselineWeek}'s row, and raise neither.${rpeNote}`;
}

/**
 * {@link evaluateFirstBuildPhaseHardness} misses as Soft-fail lines: week,
 * claim, and the **Periodization wave** fix.
 *
 * @param misses - Phase-hardness misses
 */
export function formatPhaseHardnessMessage(misses: TPhaseHardnessMiss[]): string {
    return misses.map(phaseHardnessLine).join("\n");
}
