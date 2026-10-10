// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Hevy-app Day complete title checkmark (ADR 0011 SoT / 0013 A7).
 * Same join as the builder lock: Workout `routine_id` ∩ link `hevy_routine_ids`.
 */
import { describe, expect, it, vi } from "vitest";
import {
    HEVY_DAY_COMPLETE_TITLE_SUFFIX,
    hevyRoutineTitleWithCheckmark,
    linkedRoutineIdsWithWorkouts,
    markLinkedHevyRoutineTitlesComplete,
    type THevyRoutineTitleApi,
} from "@/api/hevy-day-complete-title";

const LINKED_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINKED_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UNLINKED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function day(overrides: Partial<THevyRoutine> = {}): THevyRoutine {
    return {
        id: LINKED_A,
        folder_id: 10,
        title: "1 - Push Day",
        notes: "work up",
        exercises: [
            {
                index: 0,
                title: "Bench",
                notes: "",
                rest_seconds: "90",
                exercise_template_id: "tmpl-bench",
                supersets_id: null,
                sets: [
                    {
                        index: 0,
                        type: "normal",
                        weight_kg: 100,
                        reps: 5,
                        distance_meters: null,
                        duration_seconds: null,
                        rpe: null,
                        custom_metric: null,
                        rep_range: null,
                    },
                ],
            },
        ],
        ...overrides,
    };
}

describe("hevyRoutineTitleWithCheckmark", () => {
    it("appends the Hevy-app suffix", () => {
        expect(hevyRoutineTitleWithCheckmark("1 - Push Day")).toBe(
            `1 - Push Day${HEVY_DAY_COMPLETE_TITLE_SUFFIX}`,
        );
    });

    it("does not double the suffix", () => {
        const titled = `1 - Push Day${HEVY_DAY_COMPLETE_TITLE_SUFFIX}`;
        expect(hevyRoutineTitleWithCheckmark(titled)).toBe(titled);
    });
});

describe("linkedRoutineIdsWithWorkouts", () => {
    it("intersects link IDs with Workout routine_ids", () => {
        expect(linkedRoutineIdsWithWorkouts([LINKED_A, LINKED_B], [LINKED_A, UNLINKED])).toEqual([
            LINKED_A,
        ]);
    });

    it("returns nothing for ad-hoc sessions (unlinked routine ids)", () => {
        expect(linkedRoutineIdsWithWorkouts([LINKED_A], [UNLINKED])).toEqual([]);
    });
});

describe("markLinkedHevyRoutineTitlesComplete", () => {
    it("PUTs the checkmark title for a linked Workout, preserving exercises", async () => {
        const putRoutine = vi.fn().mockResolvedValue(undefined);
        const hevy: THevyRoutineTitleApi = {
            getRoutine: vi.fn().mockResolvedValue(day()),
            putRoutine,
        };

        const result = await markLinkedHevyRoutineTitlesComplete({
            apiKey: "hevy-key",
            linkedRoutineIds: [LINKED_A, LINKED_B],
            workoutRoutineIds: [LINKED_A],
            hevy,
        });

        expect(result).toEqual({ updated: 1, skipped: 0, failed: 0 });
        expect(hevy.getRoutine).toHaveBeenCalledWith("hevy-key", LINKED_A);
        expect(putRoutine).toHaveBeenCalledTimes(1);
        const payload = putRoutine.mock.calls[0]?.[2] as { title: string; notes: string; exercises: unknown[] };
        expect(payload.title).toBe(`1 - Push Day${HEVY_DAY_COMPLETE_TITLE_SUFFIX}`);
        expect(payload).not.toHaveProperty("folder_id");
        expect(payload.notes).toBe("work up");
        expect(payload.exercises).toHaveLength(1);
        expect(payload.exercises[0]).toMatchObject({
            exercise_template_id: "tmpl-bench",
            sets: [{ type: "normal", weight_kg: 100, reps: 5 }],
        });
    });

    it("does not PUT when the Hevy title already has the checkmark", async () => {
        const putRoutine = vi.fn().mockResolvedValue(undefined);
        const hevy: THevyRoutineTitleApi = {
            getRoutine: vi.fn().mockResolvedValue(
                day({ title: `1 - Push Day${HEVY_DAY_COMPLETE_TITLE_SUFFIX}` }),
            ),
            putRoutine,
        };

        const result = await markLinkedHevyRoutineTitlesComplete({
            apiKey: "hevy-key",
            linkedRoutineIds: [LINKED_A],
            workoutRoutineIds: [LINKED_A],
            hevy,
        });

        expect(result).toEqual({ updated: 0, skipped: 1, failed: 0 });
        expect(putRoutine).not.toHaveBeenCalled();
    });

    it("does not PUT unlinked Workout routine ids", async () => {
        const hevy: THevyRoutineTitleApi = {
            getRoutine: vi.fn(),
            putRoutine: vi.fn(),
        };

        const result = await markLinkedHevyRoutineTitlesComplete({
            apiKey: "hevy-key",
            linkedRoutineIds: [LINKED_A],
            workoutRoutineIds: [UNLINKED],
            hevy,
        });

        expect(result).toEqual({ updated: 0, skipped: 0, failed: 0 });
        expect(hevy.getRoutine).not.toHaveBeenCalled();
        expect(hevy.putRoutine).not.toHaveBeenCalled();
    });

    it("continues when one PUT fails", async () => {
        const hevy: THevyRoutineTitleApi = {
            getRoutine: vi.fn().mockImplementation((_key: string, id: string) =>
                Promise.resolve(day({ id, title: id === LINKED_A ? "Push" : "Pull" })),
            ),
            putRoutine: vi.fn().mockImplementation((_key: string, id: string) => {
                if (id === LINKED_A) {
                    return Promise.reject(new Error("HTTP PUT error! Status: 500"));
                }
                return Promise.resolve(undefined);
            }),
        };

        const result = await markLinkedHevyRoutineTitlesComplete({
            apiKey: "hevy-key",
            linkedRoutineIds: [LINKED_A, LINKED_B],
            workoutRoutineIds: [LINKED_A, LINKED_B],
            hevy,
        });

        expect(result).toEqual({ updated: 1, skipped: 0, failed: 1 });
        expect(hevy.putRoutine).toHaveBeenCalledTimes(2);
    });
});
