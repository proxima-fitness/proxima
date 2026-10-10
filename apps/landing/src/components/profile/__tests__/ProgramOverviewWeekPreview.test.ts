/**
 * Unit tests for Week preview day slicing (ADR 0020 / 03).
 */
import { describe, expect, it } from "vitest";
import {
    slicePrescriptionWeekDays,
    summarizeExercisePrescription,
    weekPreviewDayKey,
} from "../ProgramOverviewWeekPreviewModel";

function makeExercise(title: string, index: number): THevyExercise {
    return {
        index,
        title,
        notes: "",
        rest_seconds: null,
        exercise_template_id: `t-${index}`,
        supersets_id: null,
        sets: [],
    };
}

function makeRoutine(
    folderId: number,
    title: string,
    exerciseTitles: string[],
    order?: string,
    id = "",
): THevyRoutine {
    return {
        id,
        title,
        folder_id: folderId,
        notes: "",
        order,
        exercises: exerciseTitles.map((name, i) => makeExercise(name, i)),
    };
}

describe("slicePrescriptionWeekDays", () => {
    it("returns empty for missing week", () => {
        const program = [makeRoutine(0, "1 - Push", ["Bench"])];
        expect(slicePrescriptionWeekDays(program, 2)).toEqual([]);
        expect(slicePrescriptionWeekDays(program, 0)).toEqual([]);
    });

    it("returns full routines for Selected week sorted by order", () => {
        const program = [
            makeRoutine(0, "2 - Pull", ["Row"], "2"),
            makeRoutine(0, "1 - Push", ["Bench Press", "OHP"], "1"),
            makeRoutine(1, "1 - Legs", ["Squat"], "1"),
        ];

        const week1 = slicePrescriptionWeekDays(program, 1);
        expect(week1.map((d) => d.title)).toEqual(["1 - Push", "2 - Pull"]);
        expect(week1[0]?.exercises.map((e) => e.title)).toEqual(["Bench Press", "OHP"]);
        expect(slicePrescriptionWeekDays(program, 2).map((d) => d.title)).toEqual([
            "1 - Legs",
        ]);
    });
});

describe("weekPreviewDayKey", () => {
    it("prefers existing id", () => {
        expect(
            weekPreviewDayKey(makeRoutine(0, "Push", [], "1", "hevy-1"), 1, 0),
        ).toBe("hevy-1");
    });

    it("synthesizes a stable key when id missing", () => {
        expect(weekPreviewDayKey(makeRoutine(0, "Push", [], "1"), 2, 0)).toBe(
            "preview-w2-d1-Push",
        );
    });
});

function makeSet(partial: Partial<THevySets> = {}): THevySets {
    return {
        type: "normal",
        weight_kg: null,
        reps: null,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
        rpe: null,
        ...partial,
    };
}

describe("summarizeExercisePrescription", () => {
    it("returns null for empty sets", () => {
        expect(summarizeExercisePrescription([])).toBeNull();
        expect(summarizeExercisePrescription(null)).toBeNull();
    });

    it("formats shared rep range", () => {
        const sets = [
            makeSet({ reps: 10, rep_range: { start: 8, end: 12 } }),
            makeSet({ reps: 10, rep_range: { start: 8, end: 12 } }),
            makeSet({ reps: 10, rep_range: { start: 8, end: 12 } }),
            makeSet({ reps: 10, rep_range: { start: 8, end: 12 } }),
        ];
        expect(summarizeExercisePrescription(sets)).toBe("4 sets · 8-12 reps");
    });

    it("formats fixed reps", () => {
        const sets = [makeSet({ reps: 5 }), makeSet({ reps: 5 }), makeSet({ reps: 5 })];
        expect(summarizeExercisePrescription(sets)).toBe("3 sets · 5 reps");
    });

    it("falls back to set count alone when only weights are set", () => {
        expect(
            summarizeExercisePrescription([
                makeSet({ weight_kg: 60 }),
                makeSet({ weight_kg: 60 }),
            ]),
        ).toBe("2 sets");
    });
});
