import { describe, it, expect } from "vitest";
import {
    buildRepsRange2DForDb,
    generateHevySets,
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

describe("buildRepsRange2DForDb", () => {
    it("builds rectangular number[][] when every set has a range", () => {
        expect(
            buildRepsRange2DForDb([
                {
                    index: 0,
                    type: "normal",
                    weight_kg: null,
                    reps: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: { start: 8, end: 12 },
                },
                {
                    index: 1,
                    type: "normal",
                    weight_kg: null,
                    reps: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: { start: 8, end: 12 },
                },
            ]),
        ).toEqual([
            [8, 12],
            [8, 12],
        ]);
    });

    it("returns null when any set lacks a range (avoid null holes in float4[])", () => {
        expect(
            buildRepsRange2DForDb([
                {
                    index: 0,
                    type: "normal",
                    weight_kg: null,
                    reps: null,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: { start: 6, end: 8 },
                },
                {
                    index: 1,
                    type: "normal",
                    weight_kg: null,
                    reps: 8,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: null,
                },
            ]),
        ).toBeNull();
    });
});

describe("generateHevySets", () => {
    it("reads per-set nested reps_range pairs", () => {
        const sets = generateHevySets({
            reps: [null, 8],
            reps_range: [
                [6, 8],
                null,
            ],
            weights: [60, 60],
        });

        expect(sets).toHaveLength(2);
        expect(sets[0]?.rep_range).toEqual({ start: 6, end: 8 });
        expect(sets[0]?.reps).toBeNull();
        expect(sets[1]?.rep_range).toBeNull();
        expect(sets[1]?.reps).toBe(8);
    });
});
