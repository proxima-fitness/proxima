// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";
import {
    adaptHevyShareToRoutines,
    adaptHevyWorkoutToRoutines,
} from "@/lib/hevy-share/share-adapter";
import { HevyShareError } from "@/lib/hevy-share/share-errors";

const NOW = new Date("2026-07-29T10:00:00.000Z");

/** Shape of a shared folder payload as the web share endpoint returns it. */
function folderPayload() {
    return {
        shareable_folder: {
            id: "folder-share-id",
            title: "PPL 6 Day",
            routines: [
                {
                    id: "hevy-routine-uuid-2",
                    folder_id: 987,
                    index: 1,
                    title: "Pull",
                    notes: "Straps allowed",
                    exercises: [
                        {
                            exercise_template_id: "TEMPLATE_ROW",
                            title: "Barbell Row",
                            notes: "Chest supported",
                            rest_seconds: 120,
                            superset_id: 7,
                            sets: [
                                { type: "warmup", weight_kg: 40, reps: 10 },
                                { type: "normal", weight_kg: 80, rep_range: { start: 8, end: 12 }, rpe: 8 },
                            ],
                        },
                        {
                            exercise_template_id: "TEMPLATE_CURL",
                            title: "Bicep Curl",
                            rest_seconds: "60",
                            superset_id: 7,
                            sets: [{ set_type: "normal", reps: 12 }],
                        },
                    ],
                },
                {
                    id: "hevy-routine-uuid-1",
                    folder_id: 987,
                    index: 0,
                    title: "Push",
                    exercises: [
                        {
                            exercise_template_id: "TEMPLATE_BENCH",
                            title: "Bench Press",
                            sets: [{ type: "normal", reps: 5, rep_range: { start: 5, end: 5 } }],
                        },
                    ],
                },
            ],
        },
    };
}

describe("adaptHevyShareToRoutines", () => {
    it("strips foreign Hevy identity and assigns builder routine keys", () => {
        const { routines } = adaptHevyShareToRoutines(folderPayload(), NOW);
        const serialized = JSON.stringify(routines);

        expect(routines.map(routine => routine.id)).toEqual(["1", "2"]);
        expect(routines.map(routine => routine.order)).toEqual(["1", "2"]);
        expect(serialized).not.toContain("hevy-routine-uuid-1");
        expect(serialized).not.toContain("hevy-routine-uuid-2");
        expect(serialized).not.toContain("folder-share-id");
        expect(routines.every(routine => routine.folder_id === 0)).toBe(true);
    });

    it("keeps exercise template ids so Week Export can mint customs", () => {
        const { routines } = adaptHevyShareToRoutines(folderPayload(), NOW);

        expect(routines[1].exercises.map(exercise => exercise.exercise_template_id)).toEqual([
            "TEMPLATE_ROW",
            "TEMPLATE_CURL",
        ]);
    });

    it("carries mint metadata only for templates the sharer owns", () => {
        const sharerCustomId = "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f";
        const { routines } = adaptHevyShareToRoutines(
            {
                routines: [
                    {
                        title: "Mobility",
                        exercises: [
                            {
                                exercise_template_id: sharerCustomId,
                                title: "  Shoulder CARs  ",
                                exercise_type: "reps_only",
                                equipment_category: "none",
                                muscle_group: "shoulders",
                                other_muscles: ["traps", 7, "  "],
                                sets: [],
                            },
                            // Hevy library id - valid on the importer's account already.
                            { exercise_template_id: "79D0BB3A", title: "Bench Press", sets: [] },
                            // Sharer-owned, but nothing to mint a movement from.
                            { exercise_template_id: "9c7d87b6-7383-43a2-b593-e46659be575d", sets: [] },
                        ],
                    },
                ],
            },
            NOW,
        );

        const [custom, library, untitled] = routines[0].exercises;

        expect(custom.shared_template).toEqual({
            title: "Shoulder CARs",
            exercise_type: "reps_only",
            equipment_category: "none",
            muscle_group: "shoulders",
            other_muscles: ["traps"],
        });
        expect(library.shared_template).toBeUndefined();
        expect(untitled.shared_template).toBeUndefined();
    });

    it("carries mint metadata with null fields when the share omits them", () => {
        const { routines } = adaptHevyShareToRoutines(
            {
                routines: [
                    {
                        exercises: [
                            {
                                exercise_template_id: "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f",
                                title: "Sled Drag",
                                sets: [],
                            },
                        ],
                    },
                ],
            },
            NOW,
        );

        expect(routines[0].exercises[0].shared_template).toEqual({
            title: "Sled Drag",
            exercise_type: null,
            equipment_category: null,
            muscle_group: null,
            other_muscles: [],
        });
    });

    it("seeds every shared routine into week 0 ordered by the share index", () => {
        const { title, routines } = adaptHevyShareToRoutines(folderPayload(), NOW);

        expect(title).toBe("PPL 6 Day");
        expect(routines.map(routine => routine.title)).toEqual(["Push", "Pull"]);
        expect(routines.map(routine => routine.created_at)).toEqual([
            NOW.toISOString(),
            NOW.toISOString(),
        ]);
    });

    it("carries titles, notes, sets and rest across", () => {
        const { routines } = adaptHevyShareToRoutines(folderPayload(), NOW);
        const pull = routines[1];

        expect(pull.notes).toBe("Straps allowed");
        expect(pull.exercises[0]).toMatchObject({
            index: 0,
            title: "Barbell Row",
            notes: "Chest supported",
            rest_seconds: "120",
        });
        expect(pull.exercises[1].rest_seconds).toBe("60");
        expect(pull.exercises[0].sets).toEqual([
            {
                index: 0,
                type: "warmup",
                weight_kg: 40,
                reps: 10,
                distance_meters: null,
                duration_seconds: null,
                rpe: null,
                custom_metric: null,
                rep_range: null,
            },
            {
                index: 1,
                type: "normal",
                weight_kg: 80,
                reps: null,
                distance_meters: null,
                duration_seconds: null,
                rpe: 8,
                custom_metric: null,
                rep_range: { start: 8, end: 12 },
            },
        ]);
    });

    it("renumbers supersets to 0-indexed groups and collapses degenerate rep ranges", () => {
        const { routines } = adaptHevyShareToRoutines(folderPayload(), NOW);

        expect(routines[1].exercises.map(exercise => exercise.supersets_id)).toEqual([0, 0]);
        expect(routines[0].exercises[0].sets[0]).toMatchObject({ reps: 5, rep_range: null });
    });

    it("adapts a single shared routine with no folder title", () => {
        const { title, routines } = adaptHevyShareToRoutines(
            {
                routine: {
                    id: "hevy-routine-uuid",
                    title: "Full Body A",
                    exercises: [{ exercise_template_id: "TEMPLATE_SQUAT", sets: [{ reps: 5 }] }],
                },
            },
            NOW,
        );

        expect(title).toBeNull();
        expect(routines).toHaveLength(1);
        expect(routines[0]).toMatchObject({ id: "1", order: "1", folder_id: 0, title: "Full Body A" });
    });

    it("only strips a day ordinal when a real title follows it", () => {
        const { routines } = adaptHevyShareToRoutines(
            {
                routines: [
                    { title: "1 - Push Day", exercises: [] },
                    { title: "5x5 Squat", exercises: [] },
                    { title: "2024 - Off Season", exercises: [] },
                    { title: "3 - ", exercises: [] },
                ],
            },
            NOW,
        );

        expect(routines.map(routine => routine.title)).toEqual([
            "Push Day",
            "5x5 Squat",
            "2024 - Off Season",
            "3 - ",
        ]);
    });

    it("reads a bare routine payload with no wrapper", () => {
        const { routines } = adaptHevyShareToRoutines(
            { title: "Legs", exercises: [{ exercise_template_id: "TEMPLATE_SQUAT", sets: [] }] },
            NOW,
        );

        expect(routines).toHaveLength(1);
        expect(routines[0].title).toBe("Legs");
    });

    it("falls back to Day N titles and tolerates junk fields", () => {
        const { routines } = adaptHevyShareToRoutines(
            { routines: [{ exercises: [{ sets: [null, "nope"] }, 42] }] },
            NOW,
        );

        expect(routines[0].title).toBe("Day 1");
        expect(routines[0].exercises[0].exercise_template_id).toBe("");
        expect(routines[0].exercises[0].sets[0]).toMatchObject({ index: 0, type: "normal", reps: null });
        expect(routines[0].exercises[1]).toMatchObject({ index: 1, title: "", sets: [] });
    });

    it("throws malformed when the payload holds no routines", () => {
        for (const payload of [null, {}, { routines: [] }, "<html>", { data: { routines: [] } }]) {
            expect(() => adaptHevyShareToRoutines(payload, NOW)).toThrowError(HevyShareError);
        }

        expect(() => adaptHevyShareToRoutines({}, NOW)).toThrowError(
            expect.objectContaining({ reason: "malformed" }),
        );
    });
});

describe("adaptHevyWorkoutToRoutines", () => {
    function publicWorkout(overrides: Record<string, unknown> = {}) {
        return {
            type: "public",
            name: "1 - Push Day",
            username: "lifter",
            start_time: 1_700_000_000,
            end_time: 1_700_000_900,
            estimated_volume_kg: 4200.4,
            is_private: false,
            exercises: [
                {
                    exercise_template_id: "TEMPLATE_BENCH",
                    title: "Bench Press",
                    sets: [{ indicator: "normal", weight_kg: 100, reps: 5 }],
                },
            ],
            ...overrides,
        };
    }

    it("adapts a public workout into a one-day seed with session metadata", () => {
        const { title, routines, workout } = adaptHevyWorkoutToRoutines(publicWorkout(), NOW);

        expect(title).toBe("Push Day");
        expect(routines).toHaveLength(1);
        expect(routines[0]).toMatchObject({
            id: "1",
            order: "1",
            folder_id: 0,
            title: "Push Day",
        });
        expect(routines[0].exercises[0]).toMatchObject({
            exercise_template_id: "TEMPLATE_BENCH",
            title: "Bench Press",
        });
        expect(routines[0].exercises[0].sets[0]).toMatchObject({
            type: "normal",
            weight_kg: 100,
            reps: 5,
        });
        expect(workout).toEqual({
            username: "lifter",
            startedAt: "2023-11-14T22:13:20.000Z",
            durationSeconds: 900,
            estimatedVolumeKg: 4200.4,
        });
    });

    it("unwraps a one-level workout/data/result envelope", () => {
        const { title } = adaptHevyWorkoutToRoutines({ workout: publicWorkout() }, NOW);
        expect(title).toBe("Push Day");

        const wrapped = adaptHevyWorkoutToRoutines({ data: publicWorkout({ name: "Pull" }) }, NOW);
        expect(wrapped.title).toBe("Pull");
    });

    it("refuses a private or non-public workout as not_found", () => {
        expect(() => adaptHevyWorkoutToRoutines(publicWorkout({ is_private: true }), NOW)).toThrowError(
            expect.objectContaining({ reason: "not_found" }),
        );
        expect(() =>
            adaptHevyWorkoutToRoutines(publicWorkout({ type: "followers" }), NOW),
        ).toThrowError(expect.objectContaining({ reason: "not_found" }));
    });

    it("throws malformed when the payload holds no workout exercises", () => {
        expect(() => adaptHevyWorkoutToRoutines({}, NOW)).toThrowError(
            expect.objectContaining({ reason: "malformed" }),
        );
        expect(() => adaptHevyWorkoutToRoutines({ name: "Empty", type: "public" }, NOW)).toThrowError(
            expect.objectContaining({ reason: "malformed" }),
        );
    });
});
