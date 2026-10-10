// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import {
    convertHevyExerciseIntoHevyAddExercise,
    hevyAddExerciseToHevySetsConverter,
} from "../format-responses";

const mockTemplate: THevyExerciseTemplate = {
    id: "ex-1",
    title: "Bench Press",
    type: "weight_reps",
    primary_muscle_group: "chest",
    secondary_muscle_groups: ["triceps"],
    is_custom: false,
    equipment: "barbell",
    normalized_title: "bench press",
    gif_id: "gif-1",
    instructions: [],
};

const makeSet = (overrides: Partial<THevySets> & Pick<THevySets, "index">): THevySets => ({
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: null,
    custom_metric: null,
    rep_range: null,
    ...overrides,
});

const makeExercise = (sets: THevySets[]): THevyExercise => ({
    index: 0,
    title: "Bench Press",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "ex-1",
    supersets_id: null,
    sets,
});

const intensityFields = (sets: THevySets[]) =>
    sets.map((set) => ({ weight_kg: set.weight_kg, rpe: set.rpe }));

describe("hevyAddExerciseToHevySetsConverter", () => {
    const baseAddExercise = (): THevyAddExercise => ({
        selectedExercise: mockTemplate,
        repTypeValue: "reps",
        reps: [8, 8, 8],
        weightKg: null,
        rpe: null,
        setTypes: ["normal", "normal", "normal"],
        restSeconds: "90",
    });

    it("writes weight only; rpe stays null", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            weightKg: [100, 100, 100],
        });
        expect(intensityFields(sets)).toEqual([
            { weight_kg: 100, rpe: null },
            { weight_kg: 100, rpe: null },
            { weight_kg: 100, rpe: null },
        ]);
    });

    it("writes RPE only; weight_kg stays null", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            rpe: [8, 8, 8],
        });
        expect(intensityFields(sets)).toEqual([
            { weight_kg: null, rpe: 8 },
            { weight_kg: null, rpe: 8 },
            { weight_kg: null, rpe: 8 },
        ]);
    });

    it("writes both weight and RPE on the same set", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            weightKg: [100, null, null],
            rpe: [8, null, null],
        });
        expect(intensityFields(sets)[0]).toEqual({ weight_kg: 100, rpe: 8 });
    });

    it("preserves mixed per-set weight and RPE", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            weightKg: [100, null, 120],
            rpe: [null, 7, 8],
        });
        expect(intensityFields(sets)).toEqual([
            { weight_kg: 100, rpe: null },
            { weight_kg: null, rpe: 7 },
            { weight_kg: 120, rpe: 8 },
        ]);
    });

    it("persists null for blank or non-positive values, not 0", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            weightKg: [null, 0, -5],
            rpe: [null, 0, undefined] as (number | null)[],
        });
        expect(intensityFields(sets)).toEqual([
            { weight_kg: null, rpe: null },
            { weight_kg: null, rpe: null },
            { weight_kg: null, rpe: null },
        ]);
    });

    it("null weightKg and rpe fields produce unprescribed sets", () => {
        const sets = hevyAddExerciseToHevySetsConverter({
            ...baseAddExercise(),
            weightKg: null,
            rpe: null,
        });
        expect(intensityFields(sets)).toEqual([
            { weight_kg: null, rpe: null },
            { weight_kg: null, rpe: null },
            { weight_kg: null, rpe: null },
        ]);
    });
});

describe("convertHevyExerciseIntoHevyAddExercise round-trip", () => {
    const roundTripIntensity = async (sets: THevySets[]) => {
        const exercise = makeExercise(sets);
        const form = await convertHevyExerciseIntoHevyAddExercise(
            exercise,
            undefined,
            [mockTemplate],
        );
        return intensityFields(hevyAddExerciseToHevySetsConverter(form));
    };

    it("weight only → round-trip preserves weight, rpe null", async () => {
        const result = await roundTripIntensity([
            makeSet({ index: 0, weight_kg: 100, rpe: null }),
            makeSet({ index: 1, weight_kg: 100, rpe: null }),
        ]);
        expect(result).toEqual([
            { weight_kg: 100, rpe: null },
            { weight_kg: 100, rpe: null },
        ]);
    });

    it("RPE only → round-trip preserves RPE, weight_kg null", async () => {
        const result = await roundTripIntensity([
            makeSet({ index: 0, weight_kg: null, rpe: 8 }),
            makeSet({ index: 1, weight_kg: null, rpe: 9 }),
        ]);
        expect(result).toEqual([
            { weight_kg: null, rpe: 8 },
            { weight_kg: null, rpe: 9 },
        ]);
    });

    it("both on same set → round-trip preserves both", async () => {
        const result = await roundTripIntensity([
            makeSet({ index: 0, weight_kg: 100, rpe: 8 }),
        ]);
        expect(result).toEqual([{ weight_kg: 100, rpe: 8 }]);
    });

    it("mixed per-set values → round-trip intact", async () => {
        const result = await roundTripIntensity([
            makeSet({ index: 0, weight_kg: 100, rpe: null }),
            makeSet({ index: 1, weight_kg: null, rpe: 7 }),
            makeSet({ index: 2, weight_kg: 120, rpe: 8 }),
        ]);
        expect(result).toEqual([
            { weight_kg: 100, rpe: null },
            { weight_kg: null, rpe: 7 },
            { weight_kg: 120, rpe: 8 },
        ]);
    });

    it("blank unprescribed fields → null in THevySets, not 0", async () => {
        const result = await roundTripIntensity([
            makeSet({ index: 0, weight_kg: null, rpe: null }),
            makeSet({ index: 1, weight_kg: 0, rpe: 0 }),
        ]);
        expect(result).toEqual([
            { weight_kg: null, rpe: null },
            { weight_kg: null, rpe: null },
        ]);
    });

    it("all-blank weight and RPE hydrate as null fields", async () => {
        const form = await convertHevyExerciseIntoHevyAddExercise(
            makeExercise([
                makeSet({ index: 0, weight_kg: null, rpe: null }),
                makeSet({ index: 1, weight_kg: null, rpe: null }),
            ]),
            undefined,
            [mockTemplate],
        );
        expect(form.weightKg).toBeNull();
        expect(form.rpe).toBeNull();
    });

    it("stringifies Hevy numeric rest_seconds for the edit dialog", async () => {
        const hevyExercise: object = {
            ...makeExercise([makeSet({ index: 0 })]),
            rest_seconds: 90,
        };
        const form = await convertHevyExerciseIntoHevyAddExercise(
            hevyExercise as THevyExercise,
            undefined,
            [mockTemplate],
        );
        expect(form.restSeconds).toBe("90");
    });
});
