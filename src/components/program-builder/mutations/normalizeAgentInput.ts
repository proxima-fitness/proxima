/** Coerce common agent mistakes before Zod validation on mutateProgram operations. */

/** Nested object fields per op that agents sometimes stringify. */
export const OP_NESTED_OBJECT_FIELDS: Record<string, string[]> = {
    insert_exercise: ["exercise"],
    edit_exercise: ["exercise"],
    swap_exercise_template: ["to"],
    update_set: ["set"],
};

function normalizeAgentSetInput(set: unknown, arrayIndex: number): Record<string, unknown> {
    if (typeof set !== "object" || set === null) {
        return { index: arrayIndex + 1, type: "normal" };
    }

    const raw = set as Record<string, unknown>;
    const index =
        typeof raw.index === "number" && raw.index >= 1 ? raw.index : arrayIndex + 1;

    return {
        index,
        type: typeof raw.type === "string" ? raw.type : "normal",
        weight_kg: raw.weight_kg !== undefined ? raw.weight_kg : null,
        reps: raw.reps !== undefined ? raw.reps : null,
        distance_meters: raw.distance_meters !== undefined ? raw.distance_meters : null,
        duration_seconds: raw.duration_seconds !== undefined ? raw.duration_seconds : null,
        rpe: raw.rpe !== undefined ? raw.rpe : null,
        custom_metric: raw.custom_metric !== undefined ? raw.custom_metric : null,
        rep_range: raw.rep_range !== undefined ? raw.rep_range : null,
    };
}

function tryParseJsonObject(value: string): Record<string, unknown> | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
}

function unwrapJsonObject(value: unknown): unknown {
    if (typeof value !== "string") return value;
    return tryParseJsonObject(value) ?? value;
}

function hasExerciseSets(value: unknown): boolean {
    return (
        typeof value === "object" &&
        value !== null &&
        Array.isArray((value as Record<string, unknown>).sets)
    );
}

function normalizeExercisePayload(value: unknown): unknown {
    const unwrapped = unwrapJsonObject(value);
    if (typeof unwrapped !== "object" || unwrapped === null) return unwrapped;

    const raw = { ...(unwrapped as Record<string, unknown>) };
    if (Array.isArray(raw.sets)) {
        raw.sets = raw.sets.map((set, i) => normalizeAgentSetInput(set, i));
    }
    return raw;
}

function normalizeNestedObjectField(value: unknown): unknown {
    const unwrapped = unwrapJsonObject(value);
    if (hasExerciseSets(unwrapped)) {
        return normalizeExercisePayload(unwrapped);
    }
    return unwrapped;
}

function coerceWeekIndex(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
        return Number(value);
    }
    return null;
}

function coerceFolderIdsArray(value: unknown): number[] | null {
    const single = coerceWeekIndex(value);
    if (single !== null) return [single];

    if (!Array.isArray(value) || value.length === 0) return null;

    const ids = value.map(coerceWeekIndex);
    if (ids.some((id) => id === null)) return null;
    return ids as number[];
}

/** Agents often send folderId / folder_id (from readProgram) instead of folderIds: [n]. */
export function normalizeAgentOperationInput(val: unknown): unknown {
    if (typeof val !== "object" || val === null) return val;

    const obj = { ...(val as Record<string, unknown>) };

    if (obj.op === undefined) {
        if (typeof obj.type === "string") {
            obj.op = obj.type;
            delete obj.type;
        } else if (typeof obj.operation === "string") {
            obj.op = obj.operation;
            delete obj.operation;
        }
    }

    if (obj.folderIds !== undefined) {
        const coerced = coerceFolderIdsArray(obj.folderIds);
        if (coerced) obj.folderIds = coerced;
    } else {
        const weekIndex =
            coerceWeekIndex(obj.folderId) ??
            coerceWeekIndex(obj.folder_id) ??
            coerceWeekIndex(obj.weekIndex);
        if (weekIndex !== null) {
            delete obj.folderId;
            delete obj.folder_id;
            delete obj.weekIndex;
            obj.folderIds = [weekIndex];
        } else {
            const weekOneBased = coerceWeekIndex(obj.week);
            if (weekOneBased !== null && weekOneBased >= 1) {
                delete obj.week;
                obj.folderIds = [weekOneBased - 1];
            }
        }
    }

    const op = obj.op;
    if (typeof op !== "string") return obj;

    const nestedFields = OP_NESTED_OBJECT_FIELDS[op];
    if (nestedFields) {
        for (const field of nestedFields) {
            if (obj[field] !== undefined) {
                obj[field] = normalizeNestedObjectField(obj[field]);
            }
        }
    }

    return obj;
}
