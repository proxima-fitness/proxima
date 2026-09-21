import { describe, expect, it } from "vitest";

import type { TPeriodizationWave } from "../periodization-wave";
import { buildSanitySnapshot, plateThenStamp, plateWeek1Across } from "../snapshot";
import {
    claimedWeekNumbers,
    evaluateFirstBuildWeekCoverage,
    evaluateWeekCoverage,
    formatFirstBuildWeekCoverageMessage,
    formatWeekCoverageMessage,
    planWeekIntents,
} from "../week-coverage";
import type { TExerciseRoleAssignment, TProgramPlan, TProgramSanitySnapshot } from "../types";

function makeSet(rpe: number | null = 8): THevySets {
    return {
        index: 0,
        type: "normal",
        reps: 8,
        weight_kg: null,
        rpe,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
        rep_range: null,
    };
}

function makeDay(folderId: number, order: string, rpe: number | null = 8): THevyRoutine {
    return {
        id: `${folderId}-${order}`,
        title: `Day ${order}`,
        folder_id: folderId,
        order,
        notes: "",
        exercises: [
            {
                index: 0,
                title: "Squat",
                notes: "",
                rest_seconds: "120",
                exercise_template_id: "ex-1",
                supersets_id: null,
                sets: [makeSet(rpe)],
            },
        ],
    };
}

const deloadPlan: TProgramPlan = {
    durationWeeks: 4,
    blocks: [
        { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
        { name: "Deload", weeks: [4], intent: "Unload" },
    ],
};

function snapshotFrom(program: THevyRoutine[], plan: TProgramPlan | null = deloadPlan): TProgramSanitySnapshot {
    return buildSanitySnapshot({
        userMessage: "periodize",
        plan,
        beforeProgram: program,
        afterProgram: program,
    });
}

describe("claimedWeekNumbers", () => {
    it("uses plan deload/peak/easy/taper weeks when those intents exist", () => {
        expect(claimedWeekNumbers(planWeekIntents(deloadPlan), "yes", 4)).toEqual([4]);
    });

    it("defaults the last week as the claimed deload when deloadWeek is yes and the plan has no week intent", () => {
        expect(claimedWeekNumbers([], "yes", 6)).toEqual([6]);
        expect(claimedWeekNumbers(planWeekIntents({
            durationWeeks: 6,
            blocks: [{ name: "Accumulation", weeks: [1, 2, 3, 4, 5, 6], intent: "Volume" }],
        }), "yes", 6)).toEqual([6]);
    });

    it("does not invent a deload when there is no plan claim and deloadWeek is not yes", () => {
        expect(claimedWeekNumbers([], "no", 4)).toEqual([]);
        expect(claimedWeekNumbers([], "", 4)).toEqual([]);
        expect(claimedWeekNumbers([], undefined, 4)).toEqual([]);
    });
});

describe("evaluateWeekCoverage", () => {
    it("fails when a claimed week day still matches week 1 set count and RPE", () => {
        const cloned = plateWeek1Across([makeDay(0, "1"), makeDay(0, "2")], 4);
        const result = evaluateWeekCoverage(snapshotFrom(cloned), "");
        expect(result.ok).toBe(false);
        expect(result.misses).toEqual([
            { week: 4, day: 1 },
            { week: 4, day: 2 },
        ]);
        expect(formatWeekCoverageMessage(result.misses)).toBe(
            "weekCoverage: week 4 day 1 matches week 1 set count and RPE\nweekCoverage: week 4 day 2 matches week 1 set count and RPE",
        );
    });

    it("passes when the claimed week changed RPE", () => {
        const plated = plateWeek1Across([makeDay(0, "1")], 4).map((day) =>
            day.folder_id === 3
                ? makeDay(3, day.order ?? "1", 5)
                : day,
        );
        const result = evaluateWeekCoverage(snapshotFrom(plated), "");
        expect(result.ok).toBe(true);
        expect(result.misses).toEqual([]);
    });

    it("treats week 1 vs week 1 as a no-op even with deloadWeek yes", () => {
        const week1Only = [makeDay(0, "1"), makeDay(0, "2")];
        const result = evaluateWeekCoverage(snapshotFrom(week1Only, null), "yes");
        expect(result.ok).toBe(true);
        expect(result.misses).toEqual([]);
    });

    it("passes a later-week clone when no plan claim and deloadWeek is not yes", () => {
        const cloned = plateWeek1Across([makeDay(0, "1")], 4);
        const result = evaluateWeekCoverage(snapshotFrom(cloned, null), "no");
        expect(result.ok).toBe(true);
    });

    it("fails last week when deloadWeek is yes, the plan has no week intent, and last week is still a clone", () => {
        const cloned = plateWeek1Across([makeDay(0, "1")], 4);
        const result = evaluateWeekCoverage(snapshotFrom(cloned, null), "yes");
        expect(result.ok).toBe(false);
        expect(result.misses).toEqual([{ week: 4, day: 1 }]);
    });

    it("passes a claimed-week clone when skipSameWeekCoverage is set", () => {
        const cloned = plateWeek1Across([makeDay(0, "1"), makeDay(0, "2")], 4);
        const result = evaluateWeekCoverage(snapshotFrom(cloned), "", true);
        expect(result.ok).toBe(true);
        expect(result.misses).toEqual([]);
    });
});

function makeExercise(title: string, rpe: number, setCount: number): THevyExercise {
    return {
        index: 0,
        title,
        notes: "",
        rest_seconds: "90",
        exercise_template_id: title,
        supersets_id: null,
        sets: Array.from({ length: setCount }, () => makeSet(rpe)),
    };
}

/** Week-1 day: warmup row, main row, accessory row. */
function makeRoleDay(order: string): THevyRoutine {
    return {
        id: order,
        title: `Day ${order}`,
        folder_id: 0,
        order,
        notes: "",
        exercises: [
            makeExercise("Bike", 5, 1),
            makeExercise("Squat", 8, 3),
            makeExercise("Curl", 8, 3),
        ],
    };
}

function rolesFor(orders: number[]): TExerciseRoleAssignment[] {
    return orders.flatMap((dayOrder) => [
        { dayOrder, exerciseIndex: 0, role: "warmup" as const },
        { dayOrder, exerciseIndex: 1, role: "main" as const },
        { dayOrder, exerciseIndex: 2, role: "accessory" as const },
    ]);
}

function wave(rows: TPeriodizationWave["weeks"]): TPeriodizationWave {
    return { weeks: rows };
}

function stampedProgram(waveRows: TPeriodizationWave["weeks"], weekCount: number): THevyRoutine[] {
    const result = plateThenStamp([makeRoleDay("1"), makeRoleDay("2")], wave(waveRows), rolesFor([1, 2]), weekCount);
    if (!result.ok) throw new Error(result.message);
    return result.program;
}

describe("evaluateFirstBuildWeekCoverage", () => {
    it("passes stamped later-week mains that differ from week 1", () => {
        const program = stampedProgram([
            { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
            { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
            { week: 3, main: { rpeDelta: 0, setCountDelta: 1 } },
        ], 3);
        const result = evaluateFirstBuildWeekCoverage(program, rolesFor([1, 2]));
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("fails later-week mains that still match week 1 even with no claimed week", () => {
        const program = stampedProgram([
            { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
            { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
            { week: 3, main: { rpeDelta: 0, setCountDelta: 0 } },
        ], 3);
        const result = evaluateFirstBuildWeekCoverage(program, rolesFor([1, 2]));
        expect(result.ok).toBe(false);
        expect(result.misses).toEqual([
            { week: 3, day: 1 },
            { week: 3, day: 2 },
        ]);
        expect(formatFirstBuildWeekCoverageMessage(result.misses)).toBe(
            "weekCoverage: week 3 day 1 mains match week 1 set count and RPE\nweekCoverage: week 3 day 2 mains match week 1 set count and RPE",
        );
    });

    it("ignores accessories and warmup rows that match week 1", () => {
        const program = stampedProgram([
            { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
            { week: 2, main: { rpeDelta: -1, setCountDelta: 0 } },
        ], 2);
        const week2 = program.filter((day) => day.folder_id === 1);
        expect(week2.every((day) => day.exercises[2].sets.every((set) => set.rpe === 8))).toBe(true);
        expect(evaluateFirstBuildWeekCoverage(program, rolesFor([1, 2])).ok).toBe(true);
    });

    it("passes main clones when the Program stalemate same-week skip is set", () => {
        const program = plateWeek1Across([makeRoleDay("1")], 4);
        const result = evaluateFirstBuildWeekCoverage(program, rolesFor([1]), true);
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("is a pass for a one-week program", () => {
        const program = plateWeek1Across([makeRoleDay("1")], 1);
        expect(evaluateFirstBuildWeekCoverage(program, rolesFor([1])).ok).toBe(true);
    });
});
