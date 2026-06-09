import { z } from "zod";

const folderIdsSchema = z.array(z.number().int().nonnegative()).min(1);
const singleFolderIdsSchema = z.array(z.number().int().nonnegative()).length(1);

const SINGLE_FOLDER_ID_OPS = new Set(["add_day", "delete_week", "add_routine_as_day"]);

/** Agents often send folderId / folder_id (from readProgram) instead of folderIds: [n]. */
export function normalizeAgentOperationInput(val: unknown): unknown {
    if (typeof val !== "object" || val === null) return val;
    const obj = val as Record<string, unknown>;
    if (typeof obj.op !== "string" || !SINGLE_FOLDER_ID_OPS.has(obj.op)) return val;
    if (obj.folderIds !== undefined) return val;
    const weekIndex = obj.folderId ?? obj.folder_id;
    if (typeof weekIndex !== "number") return val;
    const { folderId: _f, folder_id: _g, ...rest } = obj;
    return { ...rest, folderIds: [weekIndex] };
}
const dayOrderSchema = z.number().int().min(1);
const exerciseIndexSchema = z.number().int().nonnegative();
const setIndexSchema = z.number().int().nonnegative();

const hevyRepRangeSchema = z.object({
    start: z.number(),
    end: z.number(),
});

const hevySetShape = {
    index: z.number().int().min(1),
    type: z.string(),
    weight_kg: z.number().nullable(),
    reps: z.number().nullable(),
    distance_meters: z.number().nullable(),
    duration_seconds: z.number().nullable(),
    rpe: z.number().nullable(),
    custom_metric: z.number().nullable(),
    rep_range: hevyRepRangeSchema.nullable(),
} as const;

const hevySetSchema = z.object(hevySetShape);
const hevySetPatchSchema = z.object(hevySetShape).partial();

export type TZodHevySet = z.infer<typeof hevySetSchema>;

/** Zod v4 treats nullable fields as optional on output; normalize before grid state. */
export function toHevySet(set: TZodHevySet): THevySets {
    return {
        index: set.index,
        type: set.type,
        weight_kg: set.weight_kg ?? null,
        reps: set.reps ?? null,
        distance_meters: set.distance_meters ?? null,
        duration_seconds: set.duration_seconds ?? null,
        rpe: set.rpe ?? null,
        custom_metric: set.custom_metric ?? null,
        rep_range: set.rep_range ?? null,
    };
}

export const insertExercisePayloadSchema = z.object({
    exercise_template_id: z.string().min(1),
    title: z.string().optional(),
    notes: z.string().optional(),
    rest_seconds: z.string().nullable().optional(),
    sets: z.array(hevySetSchema).min(1),
    supersets_id: z.number().nullable().optional(),
    reason: z.string().optional(),
});

export type TInsertExercisePayload = z.infer<typeof insertExercisePayloadSchema>;

const hevyExerciseSchema = z.object({
    index: z.number(),
    title: z.string(),
    notes: z.string(),
    rest_seconds: z.string().nullable(),
    exercise_template_id: z.string(),
    supersets_id: z.number().nullable(),
    sets: z.array(hevySetSchema),
    reason: z.string().optional(),
});

export type TZodHevyExercise = z.infer<typeof hevyExerciseSchema>;

export function toHevyExercise(exercise: TZodHevyExercise): THevyExercise {
    return {
        index: exercise.index,
        title: exercise.title,
        notes: exercise.notes,
        rest_seconds: exercise.rest_seconds ?? null,
        exercise_template_id: exercise.exercise_template_id,
        supersets_id: exercise.supersets_id ?? null,
        sets: exercise.sets.map(toHevySet),
        ...(exercise.reason !== undefined ? { reason: exercise.reason } : {}),
    };
}

export const swapExerciseTemplateMinimalToSchema = z.object({
    exercise_template_id: z.string().min(1),
    title: z.string().optional(),
    reason: z.string().optional(),
});

export type TSwapExerciseTemplateMinimalTo = z.infer<typeof swapExerciseTemplateMinimalToSchema>;

export const swapExerciseTemplateSchema = z.object({
    op: z.literal("swap_exercise_template"),
    from_exercise_template_id: z.string().min(1),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema.optional(),
    preserve_sets: z.boolean().optional(),
    to: z.record(z.string(), z.unknown()),
});

export type TSwapExerciseTemplateArgs = Omit<z.infer<typeof swapExerciseTemplateSchema>, "op">;

export const addDaySchema = z.object({
    op: z.literal("add_day"),
    folderIds: singleFolderIdsSchema,
});

export const deleteDaySchema = z.object({
    op: z.literal("delete_day"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
});

export const editDayTitleSchema = z.object({
    op: z.literal("edit_day_title"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    title: z.string(),
});

export const addDayNotesSchema = z.object({
    op: z.literal("add_day_notes"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    notes: z.string(),
});

export const deleteWeekSchema = z.object({
    op: z.literal("delete_week"),
    folderIds: singleFolderIdsSchema,
});

export const insertExerciseSchema = z.object({
    op: z.literal("insert_exercise"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    exercise: insertExercisePayloadSchema,
});

export const editExerciseSchema = z.object({
    op: z.literal("edit_exercise"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    exercise: insertExercisePayloadSchema,
});

export const deleteExerciseSchema = z.object({
    op: z.literal("delete_exercise"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
});

export const updateSetSchema = z.object({
    op: z.literal("update_set"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    setIndex: setIndexSchema,
    set: hevySetPatchSchema,
});

export const addExerciseNotesSchema = z.object({
    op: z.literal("add_exercise_notes"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    notes: z.string(),
});

export const createSupersetSchema = z.object({
    op: z.literal("create_superset"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndexes: z.array(exerciseIndexSchema).min(2),
});

export const removeFromSupersetSchema = z.object({
    op: z.literal("remove_from_superset"),
    folderIds: folderIdsSchema,
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
});

export const duplicateWeekSchema = z.object({
    op: z.literal("duplicate_week"),
    fromWeekIndex: z.number().int().nonnegative(),
    toWeekIndexes: z.array(z.number().int().nonnegative()).min(1),
});

export const duplicateDaySchema = z.object({
    op: z.literal("duplicate_day"),
    fromWeekIndex: z.number().int().nonnegative(),
    fromDayOrder: dayOrderSchema,
    toWeekIndex: z.number().int().nonnegative(),
    toDayOrders: z.array(dayOrderSchema).min(1),
});

export const reorderDayInWeekSchema = z.object({
    op: z.literal("reorder_day_in_week"),
    folderId: z.number().int().nonnegative(),
    dayId: z.string().min(1),
    beforeDayId: z.string().min(1).nullable(),
});

export const addRoutineAsDaySchema = z.object({
    op: z.literal("add_routine_as_day"),
    folderIds: singleFolderIdsSchema,
    routine: z.object({
        exercises: z.array(hevyExerciseSchema),
        title: z.string(),
        notes: z.string(),
    }),
});

export type TAddRoutineAsDayRoutine = z.infer<typeof addRoutineAsDaySchema>["routine"];
export type TAddRoutineAsDayArgs = Omit<z.infer<typeof addRoutineAsDaySchema>, "op">;
export type TEditExerciseArgs = Omit<z.infer<typeof editExerciseSchema>, "op">;

export const programOperationSchema = z.discriminatedUnion("op", [
    addDaySchema,
    deleteDaySchema,
    editDayTitleSchema,
    addDayNotesSchema,
    deleteWeekSchema,
    insertExerciseSchema,
    editExerciseSchema,
    swapExerciseTemplateSchema,
    deleteExerciseSchema,
    updateSetSchema,
    addExerciseNotesSchema,
    createSupersetSchema,
    removeFromSupersetSchema,
    duplicateWeekSchema,
    duplicateDaySchema,
    reorderDayInWeekSchema,
    addRoutineAsDaySchema,
]);

export type TProgramOperation = z.infer<typeof programOperationSchema>;
