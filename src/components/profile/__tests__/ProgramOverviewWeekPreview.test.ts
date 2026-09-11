/**
 * Unit tests for Week preview day slicing (ADR 0020 / 03).
 */
import { describe, expect, it } from "vitest";
import {
    slicePrescriptionWeekDays,
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
