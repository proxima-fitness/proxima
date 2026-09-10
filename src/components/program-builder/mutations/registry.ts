import { mutationTargetsCompletedDay } from "@/hooks/edit-persist";
import { programMutationCatalogById } from "./catalog";
import { isValidationFailure, mutationFailure, type TMutationResult, type TProgramMutationRunContext } from "./types";
import {
    detectCommonMutationFieldMistakes,
    formatMutationSchemaError,
} from "./validationErrors";

const STREAMING_FAILURE = "Can't edit the program while the assistant is responding.";
const DAY_COMPLETE_FAILURE = "This day is complete and can't be edited.";

/**
 * Run a catalog mutation against `ctx.program` and commit on success.
 * Does not toast - callers (e.g. ProgramMutationContext) surface failures.
 */
export function runProgramMutation(
    id: string,
    args: Record<string, unknown>,
    ctx: TProgramMutationRunContext,
): TMutationResult {
    if (ctx.isAgentStreaming) {
        return mutationFailure(STREAMING_FAILURE);
    }

    if (
        mutationTargetsCompletedDay(
            ctx.program,
            args,
            ctx.completedHevyRoutineIds ?? [],
        )
    ) {
        return mutationFailure(DAY_COMPLETE_FAILURE);
    }

    const mutation = programMutationCatalogById[id];
    if (!mutation) {
        return mutationFailure(`Unknown operation: ${id}`);
    }

    const parsed = mutation.schema.safeParse({ op: id, ...args });
    if (!parsed.success) {
        const mistake = detectCommonMutationFieldMistakes({ op: id, ...args });
        return mutationFailure(mistake ?? formatMutationSchemaError(parsed.error));
    }

    const result = mutation.run(ctx.program, parsed.data);
    if (isValidationFailure(result)) {
        return result;
    }

    ctx.commitWithUndo(result.program);
    return result;
}

export const programMutationRegistry = {
    run: runProgramMutation,
};
