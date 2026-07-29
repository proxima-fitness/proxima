import { describe, it, expect, vi } from "vitest";
import {
    mapSharedTemplateToPostExercise,
    mapSupabaseExerciseTemplateRowToPostExercise,
} from "../hevy_export";

describe("mapSupabaseExerciseTemplateRowToPostExercise", () => {
    const validRow = {
        title: "  My Lift  ",
        type: "weight_reps",
        equipment: "barbell",
        primary_muscle_group: "chest",
        secondary_muscle_groups: ["triceps", "shoulders"],
    };

    it("maps a valid Supabase row to THevyPostExerciseTemplate", () => {
        const out = mapSupabaseExerciseTemplateRowToPostExercise(validRow);
        expect(out).toEqual({
            title: "My Lift",
            exercise_type: "weight_reps",
            equipment_category: "barbell",
            muscle_group: "chest",
            other_muscles: ["triceps", "shoulders"],
        });
    });

    it("dedupes secondary muscles and excludes primary", () => {
        const out = mapSupabaseExerciseTemplateRowToPostExercise({
            ...validRow,
            secondary_muscle_groups: ["chest", "triceps", "triceps"],
        });
        expect(out.other_muscles).toEqual(["triceps"]);
    });

    it("throws on empty title", () => {
        expect(() =>
            mapSupabaseExerciseTemplateRowToPostExercise({
                ...validRow,
                title: "   ",
            }),
        ).toThrow("no title");
    });

    it("throws on invalid exercise type", () => {
        expect(() =>
            mapSupabaseExerciseTemplateRowToPostExercise({
                ...validRow,
                type: "not_a_real_type",
            }),
        ).toThrow("Invalid exercise type");
    });
});

describe("mapSharedTemplateToPostExercise", () => {
    const sharedTemplate: THevySharedTemplate = {
        title: "  Shoulder CARs  ",
        exercise_type: "reps_only",
        equipment_category: "none",
        muscle_group: "shoulders",
        other_muscles: ["traps", "shoulders", "traps"],
    };

    it("maps share metadata straight onto the Hevy create body", () => {
        expect(mapSharedTemplateToPostExercise(sharedTemplate, "Fallback")).toEqual({
            title: "Shoulder CARs",
            exercise_type: "reps_only",
            equipment_category: "none",
            muscle_group: "shoulders",
            other_muscles: ["traps"],
        });
    });

    it("falls back to Hevy's neutral options rather than failing the export", () => {
        expect(
            mapSharedTemplateToPostExercise(
                {
                    title: "Sled Drag",
                    exercise_type: null,
                    equipment_category: "hover_board",
                    muscle_group: "spleen",
                    other_muscles: ["spleen"],
                },
                "Fallback",
            ),
        ).toEqual({
            title: "Sled Drag",
            exercise_type: "weight_reps",
            equipment_category: "other",
            muscle_group: "other",
            other_muscles: [],
        });
    });

    it("logs the values it dropped, so share-vocabulary drift is visible", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        mapSharedTemplateToPostExercise(
            { ...sharedTemplate, equipment_category: "hover_board", other_muscles: ["spleen"] },
            "Fallback",
        );

        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("share API may have changed"),
            {
                title: "Shoulder CARs",
                dropped: expect.arrayContaining([
                    "equipment_category: hover_board",
                    "other_muscles: spleen",
                ]),
            },
        );

        warn.mockRestore();
    });

    it("stays quiet when the share simply omitted a field", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        mapSharedTemplateToPostExercise(
            { title: "Sled Drag", exercise_type: null, equipment_category: null, muscle_group: null, other_muscles: [] },
            "Fallback",
        );

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it("uses the builder title when the share carried none", () => {
        const out = mapSharedTemplateToPostExercise({ ...sharedTemplate, title: "  " }, "  Sled Drag  ");
        expect(out.title).toBe("Sled Drag");
    });
});
