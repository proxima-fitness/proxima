/** Max undo snapshots retained; oldest dropped on overflow. */
export const UNDO_STACK_CAP = 100;

/** Editor state: program + snapshot undo stack. */
export type TEditorState = {
    hevyProgram: THevyRoutine[];
    undoStack: THevyRoutine[][];
};

export type TEditorAction =
    | {
          type: "COMMIT_PROGRAM";
          program?: THevyRoutine[];
          updater?: (prev: THevyRoutine[]) => THevyRoutine[];
          recordUndo?: boolean;
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
 * New-path Save/leave dirty: never Saved with a program, or undo stack non-empty vs last Save.
 * ADR 0007 — Save clears baseline; further edits re-dirty.
 */
export function isNewPathSaveDirty(
    undoStackLength: number,
    hasSaveBaseline: boolean,
    hasProgram: boolean,
): boolean {
    if (!hasSaveBaseline) {
        return hasProgram;
    }
    return isNewPathDirty(undoStackLength);
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

            return {
                hevyProgram: nextProgram,
                undoStack: pushUndoSnapshot(state.undoStack, state.hevyProgram),
            };
        }
        case "UNDO": {
            if (state.undoStack.length === 0) {
                return state;
            }
            const snapshot = state.undoStack[state.undoStack.length - 1];
            return {
                hevyProgram: structuredClone(snapshot),
                undoStack: state.undoStack.slice(0, -1),
            };
        }
        case "REPLACE_PROGRAM":
            return { hevyProgram: action.program, undoStack: [] };
        case "CLEAR_UNDO_BASELINE":
            if (state.undoStack.length === 0) {
                return state;
            }
            return { ...state, undoStack: [] };
        default:
            return state;
    }
}
