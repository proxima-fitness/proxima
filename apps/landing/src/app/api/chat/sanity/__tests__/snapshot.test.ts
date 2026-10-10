// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

import {
    buildSanitySnapshot,
    compactSnapshotForEvaluate,
    plateWeek1Across,
    readLastUserMessage,
    resolvePlateWeekCount,
    snapshotForStandaloneEvaluate,
    uniqueExerciseTitles,
} from "../snapshot";
import type { TProgramPlan } from "../types";

function makeSet(overrides: Partial<THevySets> = {}): THevySets {
    return {
        index: 0,
        type: "normal",
        reps: 8,
        weight_kg: 60,
        rpe: 7,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
        rep_range: { start: 8, end: 10 },
        ...overrides,
    };
}

function makeExercise(overrides: Partial<THevyExercise> = {}): THevyExercise {
    return {
        index: 0,
        title: "Bench Press (Barbell)",
        notes: "keep elbows in",
        rest_seconds: "90",
        exercise_template_id: "ex-1",
        supersets_id: null,
        reason: "main press",
        builder_exercise_key: 42,
        sets: [makeSet()],
        ...overrides,
    };
}

function makeDay(overrides: Partial<THevyRoutine> = {}): THevyRoutine {
    return {
        id: "day-uuid-1",
        title: "Push",
        folder_id: 0,
        order: "1",
        notes: "day note",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        exercises: [makeExercise()],
        ...overrides,
    };
}

const deloadPlan: TProgramPlan = {
    durationWeeks: 4,
    daysPerWeek: 2,
    goal: "Get stronger",
    blocks: [
        { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
        { name: "Deload", weeks: [4], intent: "Unload, easier RPE" },
    ],
};

function collectKeys(value: unknown): string[] {
    if (value == null || typeof value !== "object") return [];
    if (Array.isArray(value)) return value.flatMap(collectKeys);
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
        key,
        ...collectKeys(child),
    ]);
}

describe("plateWeek1Across", () => {
    it("duplicates week 1 across programLength folders", () => {
        const plated = plateWeek1Across([makeDay(), makeDay({ id: "2", order: "2", title: "Pull" })], 4);
        expect(plated).toHaveLength(8);
        expect(plated.filter((day) => day.folder_id === 3)).toHaveLength(2);
        expect(plated.find((day) => day.folder_id === 3 && day.order === "2")?.title).toBe("Pull");
    });
});

describe("resolvePlateWeekCount", () => {
    it("prefers plan.durationWeeks over programLength", () => {
        expect(resolvePlateWeekCount(deloadPlan, 8)).toBe(4);
        expect(resolvePlateWeekCount(null, "6")).toBe(6);
        expect(resolvePlateWeekCount(null, null)).toBe(1);
    });
});

describe("readLastUserMessage", () => {
    it("reads the last user parts text", () => {
        expect(
            readLastUserMessage([
                { role: "user", parts: [{ type: "text", text: "older" }] },
                { role: "assistant", parts: [{ type: "text", text: "ok" }] },
                { role: "user", parts: [{ type: "text", text: "Deload week 4 please" }] },
            ]),
        ).toBe("Deload week 4 please");
    });

    it("reads string content when parts are absent", () => {
        expect(readLastUserMessage([{ role: "user", content: "Build a 4-day PPL" }])).toBe(
            "Build a 4-day PPL",
        );
    });
});

describe("buildSanitySnapshot", () => {
    it("keeps a compact numbers-only matrix and drops leftover grid fields", () => {
        const week1 = [makeDay(), makeDay({ id: "2", order: "2", title: "Pull" })];
        const before = plateWeek1Across(week1, 4);
        const after = before.map((day) => {
            if (day.folder_id !== 3 || day.order !== "1") return day;
            return {
                ...day,
                exercises: day.exercises.map((exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) => ({ ...set, rpe: 5 })),
                })),
            };
        });

        const snapshot = buildSanitySnapshot({
            userMessage: "Please deload week 4",
            constraintProfile: initializeConstraintProfile({ deloadWeek: "yes" }),
            trainingProfile: initializeTrainingProfile({ experienceLevel: "intermediate" }),
            plan: deloadPlan,
            beforeProgram: before,
            afterProgram: after,
        });

        expect(snapshot.userMessage).toBe("Please deload week 4");
        expect(snapshot.weekIntents).toEqual([
            { week: 1, name: "Accumulation", intent: "Volume" },
            { week: 2, name: "Accumulation", intent: "Volume" },
            { week: 3, name: "Accumulation", intent: "Volume" },
            { week: 4, name: "Deload", intent: "Unload, easier RPE" },
        ]);
        expect(snapshot.changedDays).toEqual([{ week: 4, day: 1 }]);
        expect(snapshot.matchingWeek1Days).toContainEqual({ week: 4, day: 2 });
        expect(snapshot.matchingWeek1Days).not.toContainEqual({ week: 4, day: 1 });

        const week4Day1 = snapshot.matrix.find((row) => row.week === 4 && row.day === 1);
        expect(week4Day1?.matchesWeek1Stimulus).toBe(false);
        expect(week4Day1?.exercises).toEqual([
            { title: "Bench Press (Barbell)", workingSetCount: 1, rpeMin: 5, rpeMax: 5 },
        ]);

        const keys = collectKeys(snapshot);
        expect(keys).not.toContain("reason");
        expect(keys).not.toContain("notes");
        expect(keys).not.toContain("builder_exercise_key");
        expect(keys).not.toContain("exercise_template_id");
        expect(keys).not.toContain("weight_kg");
        expect(keys).not.toContain("rep_range");
        expect(keys).not.toContain("sets");
        expect(keys).not.toContain("id");
    });

    it("marks week 1 rows as not matching themselves", () => {
        const week1 = [makeDay()];
        const snapshot = buildSanitySnapshot({
            userMessage: "",
            beforeProgram: week1,
            afterProgram: week1,
        });
        expect(snapshot.matrix).toEqual([
            expect.objectContaining({ week: 1, day: 1, matchesWeek1Stimulus: false }),
        ]);
        expect(snapshot.matchingWeek1Days).toEqual([]);
    });
});

describe("compactSnapshotForEvaluate", () => {
    it("drops later-week clones that this batch did not change", () => {
        const week1 = [makeDay()];
        const snapshot = buildSanitySnapshot({
            userMessage: "",
            beforeProgram: plateWeek1Across(week1, 5),
            afterProgram: plateWeek1Across(week1, 5),
        });

        const compacted = compactSnapshotForEvaluate(snapshot);
        expect(compacted.matrix.map((row) => row.week)).toEqual([1]);
        expect(snapshot.matrix).toHaveLength(5);
    });
});

describe("snapshotForStandaloneEvaluate", () => {
    it("keeps only changed days so untouched honor gaps cannot reject", () => {
        const snapshot = buildSanitySnapshot({
            userMessage: "do those",
            beforeProgram: [makeDay(), makeDay({ id: "2", order: "2", title: "Pull" })],
            afterProgram: [
                makeDay({
                    exercises: [makeExercise({ supersets_id: 1 }), makeExercise({
                        index: 1,
                        title: "Lateral Raise (Dumbbell)",
                        exercise_template_id: "ex-2",
                        supersets_id: 1,
                    })],
                }),
                makeDay({ id: "2", order: "2", title: "Pull" }),
            ],
        });

        expect(snapshot.changedDays).toEqual([{ week: 1, day: 1 }]);
        expect(snapshotForStandaloneEvaluate(snapshot).matrix).toEqual([
            expect.objectContaining({ week: 1, day: 1, title: "Push" }),
        ]);
    });
});

describe("uniqueExerciseTitles", () => {
    function row(week: number, day: number, titles: string[]) {
        return {
            week,
            day,
            title: `Day ${day}`,
            exercises: titles.map((title) => ({ title, workingSetCount: 3, rpeMin: 7, rpeMax: 8 })),
            matchesWeek1Stimulus: false,
        };
    }

    it("collapses plated repeats and keeps later-week swaps in first-seen order", () => {
        expect(uniqueExerciseTitles([
            row(1, 1, ["Squat (Barbell)", "Leg Curl (Machine)"]),
            row(2, 1, ["Squat (Barbell)", "Leg Curl (Machine)"]),
            row(5, 1, ["Front Squat (Barbell)", "Leg Curl (Machine)"]),
        ])).toEqual(["Squat (Barbell)", "Leg Curl (Machine)", "Front Squat (Barbell)"]);
    });

    it("limits to the given days", () => {
        expect(uniqueExerciseTitles(
            [row(1, 1, ["Squat (Barbell)"]), row(1, 2, ["Bench Press (Barbell)"])],
            [{ week: 1, day: 2 }],
        )).toEqual(["Bench Press (Barbell)"]);
    });

    it("skips blank titles", () => {
        expect(uniqueExerciseTitles([row(1, 1, ["  ", "Row (Cable)"])])).toEqual(["Row (Cable)"]);
    });
});
