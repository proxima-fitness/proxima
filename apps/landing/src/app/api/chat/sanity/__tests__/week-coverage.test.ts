// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import type { TPeriodizationWave } from "../periodization-wave";
import { buildSanitySnapshot, plateThenStamp, plateWeek1Across } from "../snapshot";
import {
    claimedPhaseWeeks,
    claimedWeekNumbers,
    evaluateFirstBuildPhaseHardness,
    evaluateFirstBuildWeekCoverage,
    evaluateWeekCoverage,
    formatFirstBuildWeekCoverageMessage,
    formatPhaseHardnessMessage,
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

/** Week load for one day: main working sets / RPE, and an accessory row. */
type TWeekLoad = {
    sets: number;
    rpe: number | null;
    accessorySets?: number;
};

function stampedDay(folderId: number, load: TWeekLoad): THevyRoutine {
    const day = makeDay(folderId, "1", load.rpe);
    const main = day.exercises[0];
    return {
        ...day,
        exercises: [
            { ...main, sets: Array.from({ length: load.sets }, () => makeSet(load.rpe)) },
            {
                ...main,
                index: 1,
                title: "Leg Curl",
                exercise_template_id: "ex-2",
                sets: Array.from({ length: load.accessorySets ?? 2 }, () => makeSet(7)),
            },
        ],
    };
}

/** One-day program; index = 0-based week. */
function loadProgram(weeks: TWeekLoad[]): THevyRoutine[] {
    return weeks.map((load, index) => stampedDay(index, load));
}

const hardnessRoles: TExerciseRoleAssignment[] = [
    { dayOrder: 1, exerciseIndex: 0, role: "main" },
    { dayOrder: 1, exerciseIndex: 1, role: "accessory" },
];

const peakDeloadIntents = planWeekIntents({
    durationWeeks: 5,
    blocks: [
        { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
        { name: "Peak", weeks: [4], intent: "Heavy singles" },
        { name: "Deload", weeks: [5], intent: "Recover from the peak" },
    ],
});

describe("claimedPhaseWeeks", () => {
    it("reads the block name first, so a Deload whose intent mentions the peak stays a deload", () => {
        expect(claimedPhaseWeeks(peakDeloadIntents, undefined, 5)).toEqual([
            { week: 4, phase: "peak", claim: "labeled Peak" },
            { week: 5, phase: "deload", claim: "labeled Deload" },
        ]);
    });

    it("treats the last week as the deload when deloadWeek is yes and no block claims one", () => {
        const intents = planWeekIntents({
            durationWeeks: 4,
            blocks: [{ name: "Build", weeks: [1, 2, 3, 4], intent: "Volume" }],
        });

        expect(claimedPhaseWeeks(intents, { deloadWeek: "yes" }, 4)).toEqual([
            { week: 4, phase: "deload", claim: "the deloadWeek: yes deload" },
        ]);
        expect(claimedPhaseWeeks(intents, { peakWeek: "yes" }, 4)).toEqual([]);
    });
});

describe("evaluateFirstBuildPhaseHardness (ADR 0032 C2)", () => {
    const baseline = { sets: 3, rpe: 7 };

    it("passes a real peak harder than the prior week and a real deload easier than the peak", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 8 },
            { sets: 4, rpe: 8 },
            { sets: 3, rpe: 9 },
            { sets: 2, rpe: 6 },
        ]);

        expect(evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined))
            .toEqual({ ok: true, misses: [] });
    });

    it("Soft-fails a fake peak that copies the deload deltas, with week, claim, and wave fix", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 8 },
            { sets: 4, rpe: 8 },
            { sets: 3, rpe: 6 },
            { sets: 2, rpe: 5 },
        ]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("phaseHardness.peak");
        expect(result.misses).toHaveLength(1);
        expect(formatPhaseHardnessMessage(result.misses)).toBe(
            "phaseHardness: week 4 is labeled Peak but mains are not harder than week 3 (day 1) — raise week 4 main rpeDelta and/or setCountDelta above week 3's row (do not copy the deload row).",
        );
    });

    it("Soft-fails a deload that is harder than the prior week", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 8 },
            { sets: 4, rpe: 8 },
            { sets: 3, rpe: 9 },
            { sets: 4, rpe: 9 },
        ]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("phaseHardness.deload");
        expect(formatPhaseHardnessMessage(result.misses)).toContain(
            "week 5 is labeled Deload but mains are not easier than week 4",
        );
    });

    it("does not let accessories satisfy a peak", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 8 },
            { sets: 4, rpe: 8 },
            { sets: 4, rpe: 8, accessorySets: 5 },
            { sets: 2, rpe: 6 },
        ]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined);

        expect(result.ok).toBe(false);
    });

    it("passes an intensity peak that cuts sets but raises RPE", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 8 },
            { sets: 4, rpe: 8 },
            { sets: 2, rpe: 9 },
            { sets: 1, rpe: 6 },
        ]);

        expect(evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined).ok).toBe(true);
    });

    it("passes a deload floored at one set on lower RPE alone", () => {
        const intents = planWeekIntents({
            durationWeeks: 3,
            blocks: [
                { name: "Build", weeks: [1, 2], intent: "Volume" },
                { name: "Deload", weeks: [3], intent: "Unload" },
            ],
        });
        const program = loadProgram([{ sets: 1, rpe: 7 }, { sets: 1, rpe: 8 }, { sets: 1, rpe: 6 }]);

        expect(evaluateFirstBuildPhaseHardness(program, hardnessRoles, intents, undefined).ok).toBe(true);
    });

    it("compares a two-week deload block with the week before the block", () => {
        const intents = planWeekIntents({
            durationWeeks: 4,
            blocks: [
                { name: "Build", weeks: [1, 2], intent: "Volume" },
                { name: "Deload", weeks: [3, 4], intent: "Unload" },
            ],
        });
        const program = loadProgram([baseline, { sets: 4, rpe: 8 }, { sets: 2, rpe: 6 }, { sets: 2, rpe: 6 }]);

        expect(evaluateFirstBuildPhaseHardness(program, hardnessRoles, intents, undefined).ok).toBe(true);
    });

    it("tells Andy to use setCountDelta when mains have no RPE", () => {
        const program = loadProgram([
            { sets: 3, rpe: null },
            { sets: 4, rpe: null },
            { sets: 5, rpe: null },
            { sets: 5, rpe: null },
            { sets: 2, rpe: null },
        ]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(formatPhaseHardnessMessage(result.misses)).toContain(
            "Those mains have no RPE, so rpeDelta cannot move them; change setCountDelta.",
        );
    });

    it("tells Andy RPE is capped when the week before a peak is already RPE 10", () => {
        const program = loadProgram([
            baseline,
            { sets: 3, rpe: 9 },
            { sets: 4, rpe: 10 },
            { sets: 3, rpe: 10 },
            { sets: 2, rpe: 6 },
        ]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, peakDeloadIntents, undefined);

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(formatPhaseHardnessMessage(result.misses)).toContain(
            "Week 3 mains are already RPE 10, so raise setCountDelta or lower week 3's rpeDelta.",
        );
    });

    it("Soft-fails peakWeek yes when no block claims a peak", () => {
        const intents = planWeekIntents({
            durationWeeks: 3,
            blocks: [{ name: "Build", weeks: [1, 2, 3], intent: "Volume" }],
        });
        const program = loadProgram([baseline, { sets: 4, rpe: 8 }, { sets: 4, rpe: 9 }]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, intents, { peakWeek: "yes" });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("phaseHardness.peak");
        expect(result.misses[0].kind).toBe("missingPeak");
        expect(formatPhaseHardnessMessage(result.misses)).toContain("add a Peak block before the end");
    });

    it("checks the deloadWeek: yes last week when no block claims a deload", () => {
        const intents = planWeekIntents({
            durationWeeks: 3,
            blocks: [{ name: "Build", weeks: [1, 2, 3], intent: "Volume" }],
        });
        const program = loadProgram([baseline, { sets: 4, rpe: 8 }, { sets: 4, rpe: 9 }]);

        const result = evaluateFirstBuildPhaseHardness(program, hardnessRoles, intents, { deloadWeek: "yes" });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(formatPhaseHardnessMessage(result.misses)).toContain(
            "week 3 is the deloadWeek: yes deload but mains are not easier than week 2",
        );
    });

    it("passes when there is no claim and no preference, and under the same-week skip", () => {
        const intents = planWeekIntents({
            durationWeeks: 3,
            blocks: [{ name: "Build", weeks: [1, 2, 3], intent: "Volume" }],
        });
        const flat = loadProgram([baseline, baseline, baseline]);

        expect(evaluateFirstBuildPhaseHardness(flat, hardnessRoles, intents, undefined).ok).toBe(true);
        expect(
            evaluateFirstBuildPhaseHardness(flat, hardnessRoles, peakDeloadIntents, { peakWeek: "yes" }, true).ok,
        ).toBe(true);
    });
});
