// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Adapter checked against a captured real `shareable_folder` response, so the
 * field names Hevy actually sends stay covered alongside the defensive tests.
 */
import { describe, expect, it } from "vitest";
import {
    adaptHevyShareToRoutines,
    adaptHevyWorkoutToRoutines,
} from "@/lib/hevy-share/share-adapter";
import { SHAREABLE_FOLDER_RESPONSE } from "./shareable-folder.fixture";
import { SHARED_ROUTINE_RESPONSE } from "./shared-routine.fixture";
import { SHARED_WORKOUT_RESPONSE } from "./shared-workout.fixture";

const NOW = new Date("2026-07-29T10:00:00.000Z");

describe("adaptHevyShareToRoutines - live share shape", () => {
    const { title, routines } = adaptHevyShareToRoutines(SHAREABLE_FOLDER_RESPONSE, NOW);

    it("reads the bare folder object the endpoint returns at the top level", () => {
        expect(title).toBe("Week 2 - BAD ASS PROGRAM");
        expect(routines).toHaveLength(2);
        expect(routines.map(routine => routine.id)).toEqual(["1", "2"]);
        expect(routines.every(routine => routine.folder_id === 0)).toBe(true);
    });

    it("drops the Hevy folder id, routine ids and short ids", () => {
        const serialized = JSON.stringify(routines);

        expect(serialized).not.toContain("3303690");
        expect(serialized).not.toContain("cd305898-97cf-4114-850c-2468a8c9c6a2");
        expect(serialized).not.toContain("LkSFazy2yFP");
        expect(serialized).not.toContain("Hf364xUjQ2F");
    });

    it("strips the Proxima day-ordinal prefix the builder already renders as Day N", () => {
        expect(routines.map(routine => routine.title)).toEqual(["Push Day", "Pull Day"]);
    });

    it("maps the share's `indicator` field onto the builder set type", () => {
        const benchSets = routines[0].exercises[1].sets;

        expect(benchSets.map(set => set.type)).toEqual(["warmup", "normal"]);
    });

    it("collapses Hevy's zero-filled metrics to unset", () => {
        expect(routines[0].exercises[0].sets[0]).toEqual({
            index: 0,
            type: "normal",
            weight_kg: null,
            reps: null,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: { start: 10, end: 15 },
        });
    });

    it("keeps prescriptions, notes, numeric rest and both kinds of template id", () => {
        const bench = routines[0].exercises[1];

        expect(bench).toMatchObject({
            index: 1,
            title: "Bench Press (Barbell)",
            exercise_template_id: "79D0BB3A",
            notes: "RPE 8",
            rest_seconds: "90",
        });
        expect(bench.sets[1]).toMatchObject({ weight_kg: 86.18, rep_range: { start: 6, end: 8 } });

        // User-owned Hevy custom template survives for sub-plan 4's Custom movement minting.
        expect(routines[0].exercises[0].exercise_template_id).toBe(
            "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f",
        );
        expect(routines[0].notes).toBe("Built by Proxima · https://proximafitness.com");
    });

    it("carries the sharer's custom template metadata for Week Export to mint from", () => {
        expect(routines[0].exercises[0].shared_template).toEqual({
            title: "Shoulder CARs (Controlled Articular Rotations)",
            exercise_type: "reps_only",
            equipment_category: "none",
            muscle_group: "shoulders",
            other_muscles: [],
        });
        expect(routines[0].exercises[1].shared_template).toBeUndefined();
    });

    it("renumbers the share's superset ids to 0-indexed groups", () => {
        expect(routines[1].exercises.map(exercise => exercise.supersets_id)).toEqual([0, 0]);
        expect(routines[0].exercises.map(exercise => exercise.supersets_id)).toEqual([null, null]);
    });
});

describe("adaptHevyShareToRoutines - live single-routine shape", () => {
    const { title, routines } = adaptHevyShareToRoutines(SHARED_ROUTINE_RESPONSE, NOW);

    it("unwraps the `{ routine: … }` envelope into a one-day seed", () => {
        expect(routines).toHaveLength(1);
        expect(routines[0]).toMatchObject({ id: "1", order: "1", folder_id: 0, title: "Push Day" });
    });

    it("has no folder title, since a shared routine carries none", () => {
        expect(title).toBeNull();
    });

    it("drops the routine id, short id and owning folder id", () => {
        const serialized = JSON.stringify(routines);

        expect(serialized).not.toContain("cd305898-97cf-4114-850c-2468a8c9c6a2");
        expect(serialized).not.toContain("LkSFazy2yFP");
        expect(serialized).not.toContain("3303690");
    });

    it("adapts sets the same way as the folder endpoint", () => {
        expect(routines[0].exercises.map(exercise => exercise.exercise_template_id)).toEqual([
            "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f",
            "79D0BB3A",
        ]);
        expect(routines[0].exercises[1].sets[0]).toEqual({
            index: 0,
            type: "normal",
            weight_kg: 86.18,
            reps: null,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: { start: 6, end: 8 },
        });
    });
});

describe("adaptHevyWorkoutToRoutines - live workout shape", () => {
    const { title, routines, workout } = adaptHevyWorkoutToRoutines(SHARED_WORKOUT_RESPONSE, NOW);

    it("reads the bare workout object the endpoint returns at the top level", () => {
        expect(title).toBe("Heavy – Shoulders & Back (Superhero)");
        expect(routines).toHaveLength(1);
        expect(routines[0]).toMatchObject({ id: "1", order: "1", folder_id: 0 });
    });

    it("drops the workout id and short id", () => {
        const serialized = JSON.stringify(routines);

        expect(serialized).not.toContain("b9842b34-e36e-48df-bdb4-91b1f915faf7");
        expect(serialized).not.toContain("TEMIKeOCBjI");
    });

    it("maps logged sets from indicator and keeps template ids", () => {
        expect(routines[0].exercises.map(exercise => exercise.exercise_template_id)).toEqual([
            "6AC96645",
            "1DF4A847",
        ]);
        expect(routines[0].exercises[0].sets[0]).toEqual({
            index: 0,
            type: "normal",
            weight_kg: 16,
            reps: 14,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: null,
        });
    });

    it("exposes session metadata from unix start/end times", () => {
        expect(workout).toEqual({
            username: "philtastic11",
            startedAt: "2026-03-05T17:41:30.000Z",
            durationSeconds: 4388,
            estimatedVolumeKg: 11456.5,
        });
    });
});
