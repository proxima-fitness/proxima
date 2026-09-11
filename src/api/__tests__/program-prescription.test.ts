import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

import {
    buildPrescriptionSets,
    getPrescriptionWeekRoutines,
    getProgramPrescriptionMeta,
    mapPrescriptionWeekToRoutines,
    type TPrescriptionDayRow,
} from "../program-prescription";

type TSupabase = SupabaseClient<Database>;

/** Mock builders only implement the chain under test. */
function asDb(mock: unknown): TSupabase {
    return mock as TSupabase;
}

const DAY_ROWS: TPrescriptionDayRow[] = [
    {
        id: "sched-2",
        nthDay: 2,
        nthWeek: 3,
        day_title: "Lower",
        program_workout_exercises: [
            {
                id: "ex-b",
                created_at: "2026-07-01T00:00:01.000Z",
                reps: [5, 5],
                weights: [100, 100],
                rpe: [8, 9],
                hevy_exercise_templates: { id: "tpl-squat", title: "Squat (Barbell)" },
            },
            {
                id: "ex-a",
                created_at: "2026-07-01T00:00:00.000Z",
                reps: [8],
                weights: [60],
                hevy_exercise_templates: { id: "tpl-rdl", title: "Romanian Deadlift" },
            },
        ],
    },
    {
        id: "sched-1",
        nthDay: 1,
        nthWeek: 3,
        day_title: null,
        program_workout_exercises: [],
    },
];

describe("buildPrescriptionSets", () => {
    it("maps per-set arrays onto indexed sets", () => {
        const sets = buildPrescriptionSets({
            reps: [8, 8, null],
            weights: [60, 60, 0],
            rpe: [7, 8, 0],
        });

        expect(sets).toHaveLength(3);
        expect(sets[0]).toMatchObject({ index: 0, reps: 8, weight_kg: 60, rpe: 7 });
        expect(sets[2]).toMatchObject({
            index: 2,
            reps: null,
            weight_kg: null,
            rpe: null,
        });
    });

    it("prefers a rep range over fixed reps for that set", () => {
        const sets = buildPrescriptionSets({
            reps: [8, 8],
            reps_range: [null, [6, 10]],
        });

        expect(sets[0]).toMatchObject({ reps: 8, rep_range: null });
        expect(sets[1]).toMatchObject({ reps: null, rep_range: { start: 6, end: 10 } });
    });

    it("falls back to the top of an RPE or time range", () => {
        const sets = buildPrescriptionSets({
            rpe_range: [[7, 9]],
            time_range: [[30, 45]],
        });

        expect(sets[0]).toMatchObject({ rpe: 9, duration_seconds: 45 });
    });

    it("returns no sets when the exercise has no per-set data", () => {
        expect(buildPrescriptionSets({})).toEqual([]);
    });
});

describe("mapPrescriptionWeekToRoutines", () => {
    const routines = mapPrescriptionWeekToRoutines(DAY_ROWS, 3);

    it("orders days by nthDay and numbers them from 1", () => {
        expect(routines.map((routine) => routine.order)).toEqual(["1", "2"]);
        expect(routines[0].title).toBe("Day 1");
        expect(routines[1].title).toBe("2 - Lower");
    });

    it("uses the 0-based week index as folder_id", () => {
        expect(routines.every((routine) => routine.folder_id === 2)).toBe(true);
    });

    it("orders exercises by insertion and indexes them from 0", () => {
        expect(routines[1].exercises.map((exercise) => exercise.title)).toEqual([
            "Romanian Deadlift",
            "Squat (Barbell)",
        ]);
        expect(routines[1].exercises.map((exercise) => exercise.index)).toEqual([0, 1]);
        expect(routines[1].exercises[1].sets).toHaveLength(2);
    });

    it("keeps the schedule row id so an apply path can map back", () => {
        expect(routines[1].id).toBe("sched-2");
    });
});

describe("getPrescriptionWeekRoutines", () => {
    function mockClient(rows: TPrescriptionDayRow[]) {
        const overrideTypes = vi.fn(async () => ({ data: rows, error: null }));
        const order = vi.fn(() => ({ overrideTypes }));
        const eqWeek = vi.fn(() => ({ order }));
        const eqProgram = vi.fn(() => ({ eq: eqWeek }));
        const select = vi.fn(() => ({ eq: eqProgram }));
        const from = vi.fn(() => ({ select }));
        return { client: asDb({ from }), from, eqProgram, eqWeek };
    }

    it("reads one week of schedule_workouts and maps it", async () => {
        const { client, from, eqProgram, eqWeek } = mockClient(DAY_ROWS);

        const routines = await getPrescriptionWeekRoutines(client, 42, 3);

        expect(from).toHaveBeenCalledWith("schedule_workouts");
        expect(eqProgram).toHaveBeenCalledWith("program_id", 42);
        expect(eqWeek).toHaveBeenCalledWith("nthWeek", 3);
        expect(routines).toHaveLength(2);
    });

    it("short-circuits an invalid week without querying", async () => {
        const { client, from } = mockClient(DAY_ROWS);

        await expect(getPrescriptionWeekRoutines(client, 42, 0)).resolves.toEqual([]);
        expect(from).not.toHaveBeenCalled();
    });
});

describe("getProgramPrescriptionMeta", () => {
    function mockClient(row: unknown, error: unknown = null) {
        const maybeSingle = vi.fn(async () => ({ data: row, error }));
        const eq = vi.fn(() => ({ maybeSingle }));
        const select = vi.fn(() => ({ eq }));
        return asDb({ from: vi.fn(() => ({ select })) });
    }

    it("returns title and program length", async () => {
        const client = mockClient({ id: 42, title: "Hypertrophy Block", program_length: 8 });

        await expect(getProgramPrescriptionMeta(client, 42)).resolves.toEqual({
            id: 42,
            title: "Hypertrophy Block",
            programLength: 8,
        });
    });

    it("returns null when the program is missing or unreadable", async () => {
        await expect(getProgramPrescriptionMeta(mockClient(null), 42)).resolves.toBeNull();
    });

    it("throws on a query error", async () => {
        await expect(
            getProgramPrescriptionMeta(mockClient(null, new Error("rls")), 42),
        ).rejects.toThrow("rls");
    });
});
