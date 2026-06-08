import { describe, expect, it } from "vitest";

import { editorReducer, UNDO_STACK_CAP, type TEditorState } from "./editor-reducer";

const makeDay = (id: string, title: string): THevyRoutine => ({
    id,
    folder_id: 0,
    order: "1",
    title,
    notes: "",
    exercises: [],
});

const initialState = (program: THevyRoutine[] = []): TEditorState => ({
    hevyProgram: program,
    undoStack: [],
});

describe("editorReducer", () => {
    it("COMMIT_PROGRAM pushes snapshot and sets next program", () => {
        const before = [makeDay("1", "Push")];
        const after = [makeDay("1", "Pull")];

        const state = editorReducer(
            initialState(before),
            { type: "COMMIT_PROGRAM", program: after },
        );

        expect(state.hevyProgram).toEqual(after);
        expect(state.undoStack).toHaveLength(1);
        expect(state.undoStack[0]).toEqual(before);
    });

    it("COMMIT_PROGRAM with updater pushes snapshot", () => {
        const before = [makeDay("1", "Push")];

        const state = editorReducer(initialState(before), {
            type: "COMMIT_PROGRAM",
            updater: (prev) => prev.map((day) => ({ ...day, title: "Pull" })),
        });

        expect(state.hevyProgram[0].title).toBe("Pull");
        expect(state.undoStack[0]).toEqual(before);
    });

    it("UNDO restores previous snapshot", () => {
        const before = [makeDay("1", "Push")];
        const after = [makeDay("1", "Pull")];

        const committed = editorReducer(
            initialState(before),
            { type: "COMMIT_PROGRAM", program: after },
        );
        const undone = editorReducer(committed, { type: "UNDO" });

        expect(undone.hevyProgram).toEqual(before);
        expect(undone.undoStack).toHaveLength(0);
    });

    it("UNDO on empty stack is a no-op", () => {
        const before = [makeDay("1", "Push")];
        const state = editorReducer(initialState(before), { type: "UNDO" });
        expect(state).toEqual(initialState(before));
    });

    it("recordUndo false does not push snapshot", () => {
        const before = [makeDay("1", "Push")];
        const after = [makeDay("1", "Pull")];

        const state = editorReducer(initialState(before), {
            type: "COMMIT_PROGRAM",
            program: after,
            recordUndo: false,
        });

        expect(state.hevyProgram).toEqual(after);
        expect(state.undoStack).toHaveLength(0);
    });

    it("same program reference is a no-op", () => {
        const program = [makeDay("1", "Push")];
        const state = editorReducer(initialState(program), {
            type: "COMMIT_PROGRAM",
            updater: () => program,
        });

        expect(state.undoStack).toHaveLength(0);
        expect(state.hevyProgram).toBe(program);
    });

    it("REPLACE_PROGRAM clears undo stack", () => {
        const before = [makeDay("1", "Push")];
        const after = [makeDay("1", "Pull")];
        const hydrated = [makeDay("2", "Legs")];

        const committed = editorReducer(
            initialState(before),
            { type: "COMMIT_PROGRAM", program: after },
        );

        const replaced = editorReducer(committed, {
            type: "REPLACE_PROGRAM",
            program: hydrated,
        });

        expect(replaced.hevyProgram).toEqual(hydrated);
        expect(replaced.undoStack).toHaveLength(0);
    });

    it(`drops oldest snapshot when stack exceeds cap ${UNDO_STACK_CAP}`, () => {
        let state = initialState([makeDay("0", "Start")]);

        for (let i = 1; i <= UNDO_STACK_CAP + 1; i++) {
            state = editorReducer(state, {
                type: "COMMIT_PROGRAM",
                program: [makeDay(String(i), `Day ${i}`)],
            });
        }

        expect(state.undoStack).toHaveLength(UNDO_STACK_CAP);
        expect(state.undoStack[0]).toEqual([makeDay("1", "Day 1")]);
        expect(state.hevyProgram).toEqual([makeDay(String(UNDO_STACK_CAP + 1), `Day ${UNDO_STACK_CAP + 1}`)]);
    });
});
