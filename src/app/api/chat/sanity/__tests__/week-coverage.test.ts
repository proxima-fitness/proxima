import { describe, expect, it } from "vitest";

import { buildSanitySnapshot, plateWeek1Across } from "../snapshot";
import {
    claimedWeekNumbers,
    evaluateWeekCoverage,
    formatWeekCoverageMessage,
    planWeekIntents,
} from "../week-coverage";
import type { TPlanProgram, TProgramSanitySnapshot } from "../types";

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

const deloadPlan: TPlanProgram = {
    durationWeeks: 4,
    blocks: [
        { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
        { name: "Deload", weeks: [4], intent: "Unload" },
    ],
};

function snapshotFrom(program: THevyRoutine[], plan: TPlanProgram | null = deloadPlan): TProgramSanitySnapshot {
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
});
