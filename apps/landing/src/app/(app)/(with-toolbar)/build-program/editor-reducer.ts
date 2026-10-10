/**
 * @module editor-reducer
 * Builder program + undo stack. New-path Save/leave dirty is exercise content
 * vs last Save, not chat messages (CONTEXT: Save does not require chat).
 * **Proposal marks** live on this state while that Accept is undoable (ADR 0024 / 04).
 * Depends on: proposal-marks. Used by: BuildProgram, tests.
 */

import type { TProposalMarks } from "@/components/program-builder/utils/proposal-marks";

/** Max undo snapshots retained; oldest dropped on overflow. */
export const UNDO_STACK_CAP = 100;

/** Editor state: program + snapshot undo stack + live Proposal marks. */
export type TEditorState = {
    hevyProgram: THevyRoutine[];
    undoStack: THevyRoutine[][];
    proposalMarks: TProposalMarks | null;
};

export type TEditorAction =
    | {
          type: "COMMIT_PROGRAM";
          program?: THevyRoutine[];
          updater?: (prev: THevyRoutine[]) => THevyRoutine[];
          recordUndo?: boolean;
          /** Accept-only. Replaces the live mark set; omit to keep current marks. */
          proposalMarkKeys?: number[];
      }
    | { type: "UNDO" }
    | { type: "REPLACE_PROGRAM"; program: THevyRoutine[] }
    /** After successful New-path Save: current grid is baseline; dirty clears. */
    | { type: "CLEAR_UNDO_BASELINE" };

/** Undo-stack dirty only (after a Save baseline exists). */
export function isNewPathDirty(undoStackLength: number): boolean {
    return undoStackLength > 0;
}

/**
 * New-path Save/leave dirty: never Saved with at least one exercise, or undo
 * stack non-empty vs last Save. Empty day shells are not dirty.
 * ADR 0007 — Save clears baseline; further edits re-dirty.
 *
 * @param undoStackLength - Snapshots since last Save
 * @param hasSaveBaseline - True after a successful Save this session
 * @param hasProgramContent - Any day has exercise rows
 */
export function isNewPathSaveDirty(
    undoStackLength: number,
    hasSaveBaseline: boolean,
    hasProgramContent: boolean,
): boolean {
    if (!hasSaveBaseline) {
        return hasProgramContent;
    }
    return isNewPathDirty(undoStackLength);
}

/** Inputs for New-path toolbar Save disable (chat messages are not a gate). */
export interface INewPathToolbarSaveDisabledInput {
    hasProgramContent: boolean;
    hasSaveBaseline: boolean;
    isLoading: boolean;
    isSaving: boolean;
    undoStackLength: number;
    userPresent: boolean;
}

/**
 * New-path toolbar Save disable. Signed in, chat idle, and save-dirty.
 * Does not require a chat message.
 *
 * @param input - User, in-flight, and dirty snapshot
 */
export function isNewPathToolbarSaveDisabled(
    input: INewPathToolbarSaveDisabledInput,
): boolean {
    return (
        !input.userPresent
        || input.isSaving
        || input.isLoading
        || !isNewPathSaveDirty(
            input.undoStackLength,
            input.hasSaveBaseline,
            input.hasProgramContent,
        )
    );
}

function pushUndoSnapshot(stack: THevyRoutine[][], snapshot: THevyRoutine[]): THevyRoutine[][] {
    const nextStack = [...stack, structuredClone(snapshot)];
    if (nextStack.length <= UNDO_STACK_CAP) {
        return nextStack;
    }
    return nextStack.slice(nextStack.length - UNDO_STACK_CAP);
}

function resolveNextProgram(
    state: TEditorState,
    action: Extract<TEditorAction, { type: "COMMIT_PROGRAM" }>,
): THevyRoutine[] {
    if (action.updater) {
        return action.updater(state.hevyProgram);
    }
    if (action.program) {
        return action.program;
    }
    return state.hevyProgram;
}

/** Editor reducer: snapshot undo and program commits. */
export function editorReducer(state: TEditorState, action: TEditorAction): TEditorState {
    switch (action.type) {
        case "COMMIT_PROGRAM": {
            const nextProgram = resolveNextProgram(state, action);
            if (nextProgram === state.hevyProgram) {
                return state;
            }

            const recordUndo = action.recordUndo ?? true;
            if (!recordUndo) {
                return { ...state, hevyProgram: nextProgram };
            }

            const undoStack = pushUndoSnapshot(state.undoStack, state.hevyProgram);
            const proposalMarks =
                action.proposalMarkKeys === undefined
                    ? state.proposalMarks
                    : action.proposalMarkKeys.length > 0
                        ? { keys: action.proposalMarkKeys, undoFloor: undoStack.length }
                        : null;

            return {
                hevyProgram: nextProgram,
                undoStack,
                proposalMarks,
            };
        }
        case "UNDO": {
            if (state.undoStack.length === 0) {
                return state;
            }
            const snapshot = state.undoStack[state.undoStack.length - 1];
            const undoStack = state.undoStack.slice(0, -1);
            const proposalMarks =
                state.proposalMarks != null && undoStack.length >= state.proposalMarks.undoFloor
                    ? state.proposalMarks
                    : null;
            return {
                hevyProgram: structuredClone(snapshot),
                undoStack,
                proposalMarks,
            };
        }
        case "REPLACE_PROGRAM":
            return { hevyProgram: action.program, undoStack: [], proposalMarks: null };
        case "CLEAR_UNDO_BASELINE":
            if (state.undoStack.length === 0 && state.proposalMarks == null) {
                return state;
            }
            return { ...state, undoStack: [], proposalMarks: null };
        default:
            return state;
    }
}
