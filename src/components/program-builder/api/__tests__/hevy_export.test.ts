import { describe, it, expect } from "vitest";
import { mapSupabaseExerciseTemplateRowToPostExercise } from "../hevy_export";

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
