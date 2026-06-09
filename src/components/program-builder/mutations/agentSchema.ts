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

const MUTATE_PROGRAM_INDEXING_GUIDE =
    "**Indexing:** folderIds = 0-based week (array, e.g. `[0]`). dayOrder = 1-based day. " +
    "exerciseIndex / setIndex (update_set) = 0-based. **set.index inside exercise payloads = 1-based** (1, 2, 3…) — " +
    "do not copy sets verbatim from readProgram.\n" +
    "**Nested objects:** pass object fields (`exercise`, `to`, `set`, etc.) as nested objects in tool args — never JSON strings. **insert_exercise:** one `exercise` per op (not an `exercises` array). **`exerciseIndex` is required** on every insert_exercise (empty day → 0; append → exercises.length from readProgram). Title optional — resolved from template ID.\n" +
    "**Op choice:** rename day → edit_day_title; replace one slot → edit_exercise; add rows → insert_exercise (one per row); tweak reps/RPE → update_set.\n";

const MUTATE_PROGRAM_INSERT_EXAMPLE =
    'Example insert_exercise (first row on empty day — exerciseIndex 0):\n{ "op": "insert_exercise", "folderIds": [0], "dayOrder": 1, "exerciseIndex": 0, "exercise": { "exercise_template_id": "ID", "rest_seconds": "90", "sets": [{ "index": 1, "type": "normal", "reps": 8, "weight_kg": null, "rpe": 8, "distance_meters": null, "duration_seconds": null, "custom_metric": null, "rep_range": null }] } }';

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
        MUTATE_PROGRAM_INDEXING_GUIDE +
        "\n" +
        MUTATE_PROGRAM_INSERT_EXAMPLE +
        "\n\nAvailable operations:\n" +
        operationDocs
    );
}
