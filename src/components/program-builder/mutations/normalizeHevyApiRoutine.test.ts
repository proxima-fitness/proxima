import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { runProgramMutation } from "./registry";
import { isValidationFailure } from "./types";

const makeDay = (): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    exercises: [],
});

/** Raw Hevy GET /v1/routines exercise shape (0-based set index, sparse nullable fields). */
const hevyApiRoutine = {
    title: "Upper Body",
    notes: null,
    exercises: [
        {
            index: 0,
            title: "Bench Press (Barbell)",
            notes: null,
            rest_seconds: 90,
            exercise_template_id: "05293BCA",
            supersets_id: null,
            sets: [
                { index: 0, type: "normal", weight_kg: 60, reps: 8 },
                { index: 1, type: "normal", weight_kg: 60, reps: 8 },
            ],
        },
    ],
};

describe("add_routine_as_day with Hevy API routine payload", () => {
    it("accepts raw Hevy API shape and commits a new day", () => {
        const program = [makeDay()];
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "add_routine_as_day",
            { folderIds: [0], routine: hevyApiRoutine },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();

        const next = commitWithUndo.mock.calls[0][0] as THevyRoutine[];
        expect(next).toHaveLength(2);
        expect(next[1].title).toBe("Upper Body");
        expect(next[1].exercises[0].rest_seconds).toBe("90");
        expect(next[1].exercises[0].sets[0].index).toBe(1);
        expect(next[1].exercises[0].sets[0].rpe).toBeNull();
        expect(next[1].exercises[0].sets[0].rep_range).toBeNull();
    });
});
