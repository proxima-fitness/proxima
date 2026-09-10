import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { addExerciseFormToInsertPayload } from "../handlers";
import { runProgramMutation } from "../registry";
import { isValidationFailure } from "../types";

const mockTemplate: THevyExerciseTemplate = {
    id: "bench-1",
    title: "Bench Press",
    type: "weight_reps",
    primary_muscle_group: "chest",
    secondary_muscle_groups: [],
    is_custom: false,
    equipment: "barbell",
    normalized_title: "bench press",
    gif_id: "gif-1",
    instructions: [],
};

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    exercises: [],
    ...overrides,
});

describe("runProgramMutation", () => {
    it("commits catalog result on success", () => {
        const program = [makeDay({ title: "Old" })];
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "edit_day_title",
            { folderIds: [0], dayOrder: 1, title: "New" },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].title).toBe("New");
    });

    it("does not commit on validation failure", () => {
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "add_day",
            { folderIds: [0, 1] },
            { program: [makeDay()], commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(true);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("blocks while agent is streaming", () => {
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "edit_day_title",
            { folderIds: [0], dayOrder: 1, title: "New" },
            { program: [makeDay()], commitWithUndo, isAgentStreaming: true },
        );

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("assistant is responding");
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("blocks mutations on a Day complete day", () => {
        const commitWithUndo = vi.fn();
        const hevyRoutineId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

        const result = runProgramMutation(
            "edit_day_title",
            { folderIds: [0], dayOrder: 1, title: "New" },
            {
                program: [makeDay({ hevyRoutineId })],
                commitWithUndo,
                isAgentStreaming: false,
                completedHevyRoutineIds: [hevyRoutineId],
            },
        );

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("complete");
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("insert_exercise from dialog form commits with 0-based set indices", () => {
        const program = [makeDay()];
        const commitWithUndo = vi.fn();
        const exercise = addExerciseFormToInsertPayload({
            selectedExercise: mockTemplate,
            repTypeValue: "reps",
            reps: [8, 8, 8, 8],
            weightKg: null,
            rpe: null,
            setTypes: ["normal", "normal", "normal", "normal"],
            restSeconds: "90",
        });

        expect(exercise.sets[0].index).toBe(0);

        const result = runProgramMutation(
            "insert_exercise",
            { folderIds: [0], dayOrder: 1, exerciseIndex: 0, exercise },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].exercises[0].title).toBe("Bench Press");
    });

    it("edit_exercise from Hevy-loaded numeric rest_seconds commits after adding a set", () => {
        const program = [
            makeDay({
                exercises: [
                    {
                        index: 0,
                        title: "Bench Press",
                        notes: "",
                        exercise_template_id: "bench-1",
                        supersets_id: null,
                        sets: [
                            {
                                index: 0,
                                type: "normal",
                                weight_kg: 60,
                                reps: 8,
                                distance_meters: null,
                                duration_seconds: null,
                                rpe: null,
                                custom_metric: null,
                                rep_range: null,
                            },
                        ],
                        rest_seconds: "90",
                    },
                ],
            }),
        ];
        const commitWithUndo = vi.fn();
        // Edit current week hydrates from GET /v1/routines (rest_seconds is a number).
        // The dialog copies that into restSeconds and the user adds a set without touching rest.
        const exercise = {
            ...addExerciseFormToInsertPayload({
                selectedExercise: mockTemplate,
                repTypeValue: "reps",
                reps: [8, 8],
                weightKg: [60, 60],
                rpe: null,
                setTypes: ["normal", "normal"],
                restSeconds: "90",
            }),
            rest_seconds: 90,
        };

        const result = runProgramMutation(
            "edit_exercise",
            { folderIds: [0], dayOrder: 1, exerciseIndex: 0, exercise },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].exercises[0].sets).toHaveLength(2);
        expect(commitWithUndo.mock.calls[0][0][0].exercises[0].rest_seconds).toBe("90");
    });

    it("create_superset commits via registry", () => {
        const program = [
            makeDay({
                exercises: [
                    { index: 0, title: "A", notes: "", exercise_template_id: "a", supersets_id: null, sets: [], rest_seconds: null },
                    { index: 1, title: "B", notes: "", exercise_template_id: "b", supersets_id: null, sets: [], rest_seconds: null },
                ],
            }),
        ];
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "create_superset",
            { folderIds: [0], dayOrder: 1, exerciseIndexes: [0, 1] },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].exercises[0].supersets_id).toBe(0);
        expect(commitWithUndo.mock.calls[0][0][0].exercises[1].supersets_id).toBe(0);
    });

    it("reorder_day_in_week commits via registry", () => {
        const program = [
            makeDay({ id: "1", order: "1", title: "Day 1" }),
            makeDay({ id: "2", order: "2", title: "Day 2" }),
        ];
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "reorder_day_in_week",
            { folderId: 0, dayId: "2", beforeDayId: "1" },
            { program, commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].order).toBe("1");
        expect(commitWithUndo.mock.calls[0][0][1].order).toBe("2");
    });

    it("returns failure for unknown operation id", () => {
        const commitWithUndo = vi.fn();

        const result = runProgramMutation(
            "not_real",
            {},
            { program: [makeDay()], commitWithUndo, isAgentStreaming: false },
        );

        expect(isValidationFailure(result)).toBe(true);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });
});
