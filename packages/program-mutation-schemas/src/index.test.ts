// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    normalizeAgentOperationInput,
    normalizeRestSeconds,
    programOperationSchema,
    toHevySet,
} from "./index";

describe("normalizeAgentOperationInput", () => {
    it("coerces folderId to folderIds", () => {
        const normalized = normalizeAgentOperationInput({
            op: "delete_exercise",
            folderId: 0,
            dayOrder: 1,
            exerciseIndex: 0,
        });
        expect(normalized).toMatchObject({ folderIds: [0] });
    });
});

describe("programOperationSchema", () => {
    it("accepts insert_exercise after normalize", () => {
        const normalized = normalizeAgentOperationInput({
            op: "insert_exercise",
            folderId: 0,
            dayOrder: 1,
            exerciseIndex: 0,
            exercise: {
                exercise_template_id: "ex-1",
                sets: [{ type: "normal", reps: 8 }],
            },
        });
        const parsed = programOperationSchema.safeParse(normalized);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data).toMatchObject({
            op: "insert_exercise",
            folderIds: [0],
            exercise: { exercise_template_id: "ex-1" },
        });
    });
});

describe("toHevySet", () => {
    it("fills nullables and uses array index", () => {
        expect(
            toHevySet(
                {
                    type: "normal",
                    weight_kg: 60,
                    reps: 8,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: null,
                },
                2,
            ),
        ).toEqual({
            index: 2,
            type: "normal",
            weight_kg: 60,
            reps: 8,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: null,
        });
    });
});

describe("normalizeRestSeconds", () => {
    it("stringifies finite numbers", () => {
        expect(normalizeRestSeconds(90)).toBe("90");
        expect(normalizeRestSeconds(null)).toBeNull();
    });
});
