import { z } from "zod";

import { agentExposedMutations } from "./catalog";
import {
    addDayNotesSchema,
    addDaySchema,
    addExerciseNotesSchema,
    createSupersetSchema,
    deleteDaySchema,
    deleteExerciseSchema,
    deleteWeekSchema,
    editDayTitleSchema,
    editExerciseSchema,
    insertExerciseSchema,
    normalizeAgentOperationInput,
    swapExerciseTemplateSchema,
    removeFromSupersetSchema,
    updateSetSchema,
} from "./schemas";

/** Agent-exposed ops only — tuple must stay in sync with `agentExposed: true` in catalog. */
export const agentProgramOperationSchema = z.discriminatedUnion("op", [
    insertExerciseSchema,
    editExerciseSchema,
    swapExerciseTemplateSchema,
    deleteExerciseSchema,
    updateSetSchema,
    editDayTitleSchema,
    addDayNotesSchema,
    addExerciseNotesSchema,
    deleteDaySchema,
    addDaySchema,
    deleteWeekSchema,
    createSupersetSchema,
    removeFromSupersetSchema,
]);

export type TAgentProgramOperation = z.infer<typeof agentProgramOperationSchema>;

/** Same input as mutateProgram tool — exported for tests. */
export const mutateProgramInputSchema = z.object({
    operations: z
        .array(z.preprocess(normalizeAgentOperationInput, agentProgramOperationSchema))
        .min(1)
        .describe(
            "Ordered batch of program mutations. Operations run in array order; fail-all if any op is invalid.",
        ),
});

export type TMutateProgramInput = z.infer<typeof mutateProgramInputSchema>;

/** Auto-generated tool description from registry metadata. */
export function buildMutateProgramToolDescription(): string {
    const operationDocs = agentExposedMutations
        .map((mutation) => `- **${mutation.id}**: ${mutation.description}`)
        .join("\n");

    return (
        "Apply typed mutations to the workout program. Send an **operations** array; ops run in order. " +
        "**Fail-all:** if any operation is invalid, the entire batch is rejected and nothing is applied. " +
        "Target days with **folderIds** (0-based week index, always an array e.g. `[0]`) and **dayOrder** (1-based day within week). " +
        "readProgram shows `folder_id` on each routine — map to **folderIds: [folder_id]**, not `folderId`.\n\n" +
        "Available operations:\n" +
        operationDocs
    );
}
