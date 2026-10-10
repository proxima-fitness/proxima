import type { ZodError } from "zod";

import { OP_NESTED_OBJECT_FIELDS } from "./normalizeAgentInput";

const STRINGIFIED_OBJECT_MESSAGE =
    "must be a nested object in tool args, not a JSON string - pass the object directly";

const OPS_REQUIRING_FOLDER_IDS = new Set([
    "insert_exercise",
    "edit_exercise",
    "delete_exercise",
    "update_set",
    "edit_day_title",
    "add_day_notes",
    "add_exercise_notes",
    "delete_day",
    "create_superset",
    "remove_from_superset",
    "add_day",
    "delete_week",
]);

/** Detect common agent field-name mistakes before Zod parse. */
export function detectCommonMutationFieldMistakes(raw: Record<string, unknown>): string | null {
    if (raw.op === undefined && typeof raw.type === "string") {
        return "Expected field 'op', received 'type'";
    }

    if ("operation" in raw && typeof raw.operation === "string" && raw.op === undefined) {
        return "Expected field 'op', received 'operation'";
    }

    const op = raw.op ?? raw.operation ?? raw.type;
    if (typeof op === "string") {
        for (const field of OP_NESTED_OBJECT_FIELDS[op] ?? []) {
            if (typeof raw[field] === "string") {
                return `${field} ${STRINGIFIED_OBJECT_MESSAGE}`;
            }
        }
    }

    if (op === "insert_exercise" && raw.exerciseIndex === undefined) {
        return (
            "insert_exercise requires exerciseIndex (0-based). Empty day → 0; " +
            "append → exercises.length from readProgram; multi-insert batch → rising indices (0, 1, 2…)"
        );
    }

    if (op === "edit_exercise" || op === "insert_exercise") {
        if ("new_exercise" in raw && !("exercise" in raw)) {
            return "Expected field 'exercise', received 'new_exercise'";
        }
        if ("exercises" in raw && !("exercise" in raw)) {
            return "Use 'exercise' (single object) per insert_exercise op - not an 'exercises' array";
        }
    }

    if (
        (op === "delete_day" || op === "create_superset" || op === "remove_from_superset") &&
        "dayId" in raw &&
        !("folderIds" in raw)
    ) {
        return "Target days with folderIds + dayOrder, not dayId";
    }

    if (
        typeof op === "string" &&
        OPS_REQUIRING_FOLDER_IDS.has(op) &&
        raw.folderIds === undefined &&
        "dayOrder" in raw
    ) {
        return (
            "folderIds is required (0-based week array, e.g. [0]). " +
            "readProgram folder_id maps to folderIds: [folder_id]. " +
            "Omit only for program-wide swap_exercise_template."
        );
    }

    if (
        typeof op === "string" &&
        OPS_REQUIRING_FOLDER_IDS.has(op) &&
        raw.folderIds === undefined
    ) {
        return (
            "folderIds is required (0-based week array, e.g. [0]). " +
            "readProgram folder_id maps to folderIds: [folder_id]."
        );
    }

    return null;
}

export function formatMutationSchemaError(error: ZodError): string {
    return error.issues.map((issue) => issue.message).join("; ");
}
