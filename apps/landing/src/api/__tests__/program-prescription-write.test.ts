// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Apply path for AI week suggest: week containment + per-set column patching
 * (ADR 0012 / 03).
 */
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

import {
    applyWeekSetUpdates,
    planWeekSetUpdates,
    type TPrescriptionWriteOperation,
} from "../program-prescription-write";
import type { TPrescriptionDayRow } from "../program-prescription";

type TSupabase = SupabaseClient<Database>;

/** Mock builders only implement the chain under test. */
function asDb(mock: unknown): TSupabase {
    return mock as TSupabase;
}

/** Week 4 (folder index 3): day 1 fixed-rep lifts, day 2 range-based. */
const WEEK_DAYS: TPrescriptionDayRow[] = [
    {
        id: "sched-w4-d1",
        nthDay: 1,
        nthWeek: 4,
        program_workout_exercises: [
            {
                id: "ex-bench",
                created_at: "2026-07-01T00:00:00.000Z",
                reps: [8, 8, 8],
                weights: [60, 60, 60],
                rpe: [7, 8, 8],
                hevy_exercise_templates: { id: "tpl-bench", title: "Bench Press" },
            },
            {
                id: "ex-row",
                created_at: "2026-07-01T00:00:01.000Z",
                reps: [10, 10],
                weights: [40, 40],
                hevy_exercise_templates: { id: "tpl-row", title: "Barbell Row" },
            },
        ],
    },
    {
        id: "sched-w4-d2",
        nthDay: 2,
        nthWeek: 4,
        program_workout_exercises: [
            {
                id: "ex-curl",
                created_at: "2026-07-01T00:00:02.000Z",
                reps_range: [
                    [8, 12],
                    [8, 12],
                ],
                weights: [15, 15],
                hevy_exercise_templates: { id: "tpl-curl", title: "Bicep Curl" },
            },
        ],
    },
];

function updateSet(
    overrides: Partial<Extract<TPrescriptionWriteOperation, { op: "update_set" }>> = {},
): TPrescriptionWriteOperation {
    return {
        op: "update_set",
        folderIds: [3],
        dayOrder: 1,
        exerciseIndex: 0,
        setIndex: 0,
        set: { weight_kg: 62.5 },
        ...overrides,
    };
}

describe("planWeekSetUpdates", () => {
    it("patches only the touched column, keeping the other sets' values", () => {
        const plan = planWeekSetUpdates(WEEK_DAYS, [updateSet()], 3);

        expect(plan).toMatchObject({ applied: 1, skipped: 0 });
        expect(plan.updates).toEqual([
            { exerciseId: "ex-bench", patch: { weights: [62.5, 60, 60] } },
        ]);
    });

    it("merges several operations on one exercise into a single row update", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                updateSet({ setIndex: 0, set: { weight_kg: 62.5 } }),
                updateSet({ setIndex: 1, set: { weight_kg: 62.5, rpe: 9 } }),
                updateSet({ setIndex: 2, set: { reps: 6 } }),
            ],
            3,
        );

        expect(plan.applied).toBe(3);
        expect(plan.updates).toHaveLength(1);
        expect(plan.updates[0]).toEqual({
            exerciseId: "ex-bench",
            patch: {
                weights: [62.5, 62.5, 60],
                rpe: [7, 9, 8],
                reps: [8, 8, 6],
            },
        });
    });

    it("skips an operation aimed at any other week instead of retargeting it", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                updateSet({ folderIds: [2] }),
                updateSet({ folderIds: [3, 4] }),
                updateSet({ folderIds: [4] }),
            ],
            3,
        );

        expect(plan).toEqual({ updates: [], applied: 0, skipped: 3 });
    });

    it("resolves day and exercise by prescription order", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [updateSet({ dayOrder: 1, exerciseIndex: 1, set: { weight_kg: 42.5 } })],
            3,
        );

        expect(plan.updates).toEqual([
            { exerciseId: "ex-row", patch: { weights: [42.5, 40] } },
        ]);
    });

    it("skips operations pointing past the end of the prescription", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                updateSet({ dayOrder: 7 }),
                updateSet({ exerciseIndex: 9 }),
                updateSet({ setIndex: 9 }),
            ],
            3,
        );

        expect(plan).toEqual({ updates: [], applied: 0, skipped: 3 });
    });

    it("skips exercise notes — the prescription has no column for them", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                {
                    op: "add_exercise_notes",
                    folderIds: [3],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    notes: "Pause on the chest.",
                },
            ],
            3,
        );

        expect(plan).toEqual({ updates: [], applied: 0, skipped: 1 });
    });

    it("updates a rep range on a range-based exercise", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                updateSet({
                    dayOrder: 2,
                    exerciseIndex: 0,
                    setIndex: 1,
                    set: { rep_range: { start: 10, end: 14 } },
                }),
            ],
            3,
        );

        expect(plan.applied).toBe(1);
        expect(plan.updates[0].patch.reps_range).toEqual([
            [8, 12],
            [10, 14],
        ]);
    });

    it("refuses edits that would leave reps_range jagged", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                // Fixed reps onto a range-based exercise…
                updateSet({ dayOrder: 2, exerciseIndex: 0, set: { reps: 10 } }),
                // …and a range onto an exercise that stores fixed reps.
                updateSet({ set: { rep_range: { start: 6, end: 8 } } }),
            ],
            3,
        );

        expect(plan).toEqual({ updates: [], applied: 0, skipped: 2 });
    });

    it("still applies the weight when only part of a set patch fits", () => {
        const plan = planWeekSetUpdates(
            WEEK_DAYS,
            [
                updateSet({
                    dayOrder: 2,
                    exerciseIndex: 0,
                    set: { weight_kg: 17.5, reps: 10 },
                }),
            ],
            3,
        );

        expect(plan.applied).toBe(1);
        expect(plan.updates).toEqual([
            { exerciseId: "ex-curl", patch: { weights: [17.5, 15] } },
        ]);
    });
});

describe("applyWeekSetUpdates", () => {
    function mockClient(days: TPrescriptionDayRow[]) {
        const overrideTypes = vi.fn(async () => ({ data: days, error: null }));
        const order = vi.fn(() => ({ overrideTypes }));
        const eqWeek = vi.fn(() => ({ order }));
        const eqProgram = vi.fn(() => ({ eq: eqWeek }));
        const select = vi.fn(() => ({ eq: eqProgram }));

        const selectWritten = vi.fn(
            async (): Promise<{
                data: { id: string }[] | null;
                error: Error | null;
            }> => ({
                data: [{ id: "ex-bench" }],
                error: null,
            }),
        );
        const eqId = vi.fn(() => ({ select: selectWritten }));
        const update = vi.fn(() => ({ eq: eqId }));

        const from = vi.fn((table: string) =>
            table === "schedule_workouts" ? { select } : { update },
        );

        return { client: asDb({ from }), from, eqWeek, update, eqId, selectWritten };
    }

    it("reads and writes the target week only", async () => {
        const { client, eqWeek, update, eqId } = mockClient(WEEK_DAYS);

        const result = await applyWeekSetUpdates(client, {
            programId: 42,
            targetWeek: 4,
            operations: [updateSet()],
        });

        expect(eqWeek).toHaveBeenCalledWith("nthWeek", 4);
        expect(update).toHaveBeenCalledWith({ weights: [62.5, 60, 60] });
        expect(eqId).toHaveBeenCalledWith("id", "ex-bench");
        expect(result).toEqual({ applied: 1, skipped: 0, exercisesUpdated: 1 });
    });

    it("writes nothing when every change was skipped", async () => {
        const { client, update } = mockClient(WEEK_DAYS);

        const result = await applyWeekSetUpdates(client, {
            programId: 42,
            targetWeek: 4,
            operations: [updateSet({ folderIds: [0] })],
        });

        expect(update).not.toHaveBeenCalled();
        expect(result).toEqual({ applied: 0, skipped: 1, exercisesUpdated: 0 });
    });

    it("does not query for an invalid week", async () => {
        const { client, from } = mockClient(WEEK_DAYS);

        const result = await applyWeekSetUpdates(client, {
            programId: 42,
            targetWeek: 0,
            operations: [updateSet()],
        });

        expect(from).not.toHaveBeenCalled();
        expect(result).toEqual({ applied: 0, skipped: 1, exercisesUpdated: 0 });
    });

    it("throws when a row update fails", async () => {
        const { client, selectWritten } = mockClient(WEEK_DAYS);
        selectWritten.mockResolvedValueOnce({ data: null, error: new Error("rls") });

        await expect(
            applyWeekSetUpdates(client, {
                programId: 42,
                targetWeek: 4,
                operations: [updateSet()],
            }),
        ).rejects.toThrow("rls");
    });

    it("refuses to report success when the write changed no row", async () => {
        // RLS filters a disallowed UPDATE silently: zero rows, no error.
        const { client, selectWritten } = mockClient(WEEK_DAYS);
        selectWritten.mockResolvedValueOnce({ data: [], error: null });

        await expect(
            applyWeekSetUpdates(client, {
                programId: 42,
                targetWeek: 4,
                operations: [updateSet()],
            }),
        ).rejects.toThrow("was not updated");
    });
});
