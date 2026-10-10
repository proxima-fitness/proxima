// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    editorReducer,
    isNewPathDirty,
    isNewPathSaveDirty,
    isNewPathToolbarSaveDisabled,
    UNDO_STACK_CAP,
    type TEditorState,
} from "../editor-reducer";

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
    proposalMarks: null,
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

    it("CLEAR_UNDO_BASELINE keeps program and empties undo stack (Save baseline)", () => {
        const before = [makeDay("1", "Push")];
        const after = [makeDay("1", "Pull")];

        const committed = editorReducer(
            initialState(before),
            { type: "COMMIT_PROGRAM", program: after },
        );
        expect(isNewPathDirty(committed.undoStack.length)).toBe(true);

        const cleared = editorReducer(committed, { type: "CLEAR_UNDO_BASELINE" });

        expect(cleared.hevyProgram).toEqual(after);
        expect(cleared.undoStack).toHaveLength(0);
        expect(isNewPathDirty(cleared.undoStack.length)).toBe(false);
    });

    it("CLEAR_UNDO_BASELINE is a no-op when already clean", () => {
        const program = [makeDay("1", "Push")];
        const state = initialState(program);
        expect(editorReducer(state, { type: "CLEAR_UNDO_BASELINE" })).toBe(state);
    });

    it("isNewPathDirty is true only when undo stack is non-empty", () => {
        expect(isNewPathDirty(0)).toBe(false);
        expect(isNewPathDirty(1)).toBe(true);
        expect(isNewPathDirty(3)).toBe(true);
    });

    it("isNewPathSaveDirty: never Saved with exercises is dirty; after baseline uses undo stack", () => {
        expect(isNewPathSaveDirty(0, false, true)).toBe(true);
        expect(isNewPathSaveDirty(0, false, false)).toBe(false);
        expect(isNewPathSaveDirty(0, true, true)).toBe(false);
        expect(isNewPathSaveDirty(1, true, true)).toBe(true);
    });

    it("isNewPathToolbarSaveDisabled: signed in, idle, exercises, never Saved is enabled without chat", () => {
        expect(isNewPathToolbarSaveDisabled({
            hasProgramContent: true,
            hasSaveBaseline: false,
            isLoading: false,
            isSaving: false,
            undoStackLength: 0,
            userPresent: true,
        })).toBe(false);
    });

    it("isNewPathToolbarSaveDisabled: empty day shells stay disabled", () => {
        expect(isNewPathToolbarSaveDisabled({
            hasProgramContent: false,
            hasSaveBaseline: false,
            isLoading: false,
            isSaving: false,
            undoStackLength: 0,
            userPresent: true,
        })).toBe(true);
    });

    it("isNewPathToolbarSaveDisabled: anonymous, in-flight, and clean post-Save stay disabled", () => {
        const readyWithExercises = {
            hasProgramContent: true,
            hasSaveBaseline: false,
            isLoading: false,
            isSaving: false,
            undoStackLength: 0,
            userPresent: true,
        };

        expect(isNewPathToolbarSaveDisabled({ ...readyWithExercises, userPresent: false })).toBe(true);
        expect(isNewPathToolbarSaveDisabled({ ...readyWithExercises, isLoading: true })).toBe(true);
        expect(isNewPathToolbarSaveDisabled({ ...readyWithExercises, isSaving: true })).toBe(true);
        expect(isNewPathToolbarSaveDisabled({
            ...readyWithExercises,
            hasSaveBaseline: true,
            undoStackLength: 0,
        })).toBe(true);
        expect(isNewPathToolbarSaveDisabled({
            ...readyWithExercises,
            hasSaveBaseline: true,
            undoStackLength: 1,
        })).toBe(false);
    });

    it("stores Proposal marks on Accept and keeps them across a later edit", () => {
        const before = [makeDay("1", "Push")];
        const accepted = [makeDay("1", "Pull")];
        const edited = [makeDay("1", "Legs")];

        const afterAccept = editorReducer(initialState(before), {
            type: "COMMIT_PROGRAM",
            program: accepted,
            proposalMarkKeys: [7, 8],
        });

        expect(afterAccept.proposalMarks).toEqual({ keys: [7, 8], undoFloor: 1 });

        const afterEdit = editorReducer(afterAccept, {
            type: "COMMIT_PROGRAM",
            program: edited,
        });
        expect(afterEdit.proposalMarks).toEqual({ keys: [7, 8], undoFloor: 1 });
        expect(afterEdit.undoStack).toHaveLength(2);

        const undoEdit = editorReducer(afterEdit, { type: "UNDO" });
        expect(undoEdit.proposalMarks).toEqual({ keys: [7, 8], undoFloor: 1 });
        expect(undoEdit.hevyProgram).toEqual(accepted);

        const undoAccept = editorReducer(undoEdit, { type: "UNDO" });
        expect(undoAccept.proposalMarks).toBeNull();
        expect(undoAccept.hevyProgram).toEqual(before);
    });

    it("CLEAR_UNDO_BASELINE and REPLACE_PROGRAM clear Proposal marks", () => {
        const committed = editorReducer(initialState([makeDay("1", "Push")]), {
            type: "COMMIT_PROGRAM",
            program: [makeDay("1", "Pull")],
            proposalMarkKeys: [3],
        });
        expect(committed.proposalMarks).not.toBeNull();

        const saved = editorReducer(committed, { type: "CLEAR_UNDO_BASELINE" });
        expect(saved.proposalMarks).toBeNull();
        expect(saved.hevyProgram).toEqual(committed.hevyProgram);

        const withMarks = editorReducer(initialState([makeDay("1", "Push")]), {
            type: "COMMIT_PROGRAM",
            program: [makeDay("1", "Pull")],
            proposalMarkKeys: [3],
        });
        const replaced = editorReducer(withMarks, {
            type: "REPLACE_PROGRAM",
            program: [makeDay("2", "Legs")],
        });
        expect(replaced.proposalMarks).toBeNull();
        expect(replaced.undoStack).toHaveLength(0);
    });

    it("recordUndo false Accept stores no Proposal marks", () => {
        const state = editorReducer(initialState([]), {
            type: "COMMIT_PROGRAM",
            program: [makeDay("1", "Push")],
            recordUndo: false,
            proposalMarkKeys: [1],
        });

        expect(state.proposalMarks).toBeNull();
        expect(state.undoStack).toHaveLength(0);
    });

    it("empty proposalMarkKeys on Accept replace prior marks", () => {
        const marked = editorReducer(initialState([makeDay("1", "Push")]), {
            type: "COMMIT_PROGRAM",
            program: [makeDay("1", "Pull")],
            proposalMarkKeys: [4],
        });
        const renamed = editorReducer(marked, {
            type: "COMMIT_PROGRAM",
            program: [makeDay("1", "Upper")],
            proposalMarkKeys: [],
        });

        expect(renamed.proposalMarks).toBeNull();
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
