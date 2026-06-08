import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { runProgramMutation } from "./registry";
import { isValidationFailure } from "./types";

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
