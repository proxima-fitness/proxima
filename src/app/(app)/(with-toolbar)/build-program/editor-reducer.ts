
import { applyPatch, type Operation } from "fast-json-patch";
import { toast } from "sonner";

/** Editor state: program + undo stack for atomic transitions and stable handleUndo */
type TEditorState = {
    hevyProgram: THevyRoutine[];
    undoStack: Operation[][];
};

type TEditorAction =
    | { type: "APPLY_PATCH"; newDocument: THevyRoutine[]; inversePatch: Operation[] }
    | { type: "UNDO" }
    | { type: "REPLACE_PROGRAM"; program: THevyRoutine[] }
    | { type: "UPDATE_PROGRAM"; updater: (prev: THevyRoutine[]) => THevyRoutine[] };


/** Editor reducer: handles atomic transitions and stable handleUndo */
export function editorReducer(state: TEditorState, action: TEditorAction): TEditorState {
    switch (action.type) {
        case "APPLY_PATCH":
            return {
                hevyProgram: action.newDocument,
                undoStack: [...state.undoStack, action.inversePatch],
            };
        case "UNDO": {
            if (state.undoStack.length === 0) return state;
            const inversePatch = state.undoStack[state.undoStack.length - 1];
            try {
                const result = applyPatch(
                    state.hevyProgram as object,
                    inversePatch,
                    true,
                    false
                ) as { newDocument: THevyRoutine[] };
                return {
                    hevyProgram: result.newDocument as THevyRoutine[],
                    undoStack: state.undoStack.slice(0, -1),
                };
            } catch (e) {
                toast.error("Undo failed.");
                console.error("Undo failed.", e);
                return state;
            }
        }
        case "REPLACE_PROGRAM":
            return { ...state, hevyProgram: action.program };
        case "UPDATE_PROGRAM":
            return { ...state, hevyProgram: action.updater(state.hevyProgram) };
        default:
            return state;
    }
};
