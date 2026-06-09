import type { ZodError } from "zod";

/** Detect common agent field-name mistakes before Zod parse. */
export function detectCommonMutationFieldMistakes(raw: Record<string, unknown>): string | null {
    if ("operation" in raw && typeof raw.operation === "string") {
        return "Expected field 'op', received 'operation'";
    }

    const op = raw.op ?? raw.operation;
    if (op === "edit_exercise" || op === "insert_exercise") {
        if ("new_exercise" in raw && !("exercise" in raw)) {
            return "Expected field 'exercise', received 'new_exercise'";
        }
    }

    if (
        (op === "delete_day" || op === "create_superset" || op === "remove_from_superset") &&
        "dayId" in raw &&
        !("folderIds" in raw)
    ) {
        return "Target days with folderIds + dayOrder, not dayId";
    }

    return null;
}

export function formatMutationSchemaError(error: ZodError): string {
    return error.issues.map((issue) => issue.message).join("; ");
}
