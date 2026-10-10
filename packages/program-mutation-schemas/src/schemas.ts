import { z } from "zod";

export { normalizeAgentOperationInput } from "./normalizeAgentInput";
import { normalizeHevyApiRoutineForAddDay, normalizeRestSeconds } from "./normalizeHevyApiRoutine";
import type { THevyExercise, THevySet } from "./hevy-types";

export type { THevyExercise, THevyRepRange, THevySet } from "./hevy-types";

const folderIdsSchema = z
    .array(z.number().int().nonnegative())
    .min(1)
    .describe("0-based week index(es). Week 1 → [0]. Always an array, not folderId.");
const singleFolderIdsSchema = z
    .array(z.number().int().nonnegative())
    .length(1)
    .describe("Exactly one 0-based week index, e.g. [0] for week 1.");

const dayOrderSchema = z
    .number()
    .int()
    .min(1)
    .describe("1-based day within the week (matches routine order).");
const exerciseIndexSchema = z
    .number()
    .int()
    .nonnegative()
    .describe("0-based index in the day's exercises[]. Use length to append.");
const setIndexSchema = z
    .number()
    .int()
    .nonnegative()
    .describe("0-based index in the exercise's sets[] (for update_set only).");

const hevyRepRangeSchema = z.object({
    start: z.number(),
    end: z.number(),
});

const hevySetShape = {
    index: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Optional; assigned from sets[] array order (0-based). Not update_set setIndex."),
    type: z.string().describe('Set type, usually "normal".'),
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
export function toHevySet(set: TZodHevySet, arrayIndex: number): THevySet {
    return {
        index: arrayIndex,
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

const restSecondsFieldSchema = z.preprocess(
    (value) => (value === undefined ? undefined : normalizeRestSeconds(value)),
    z.string().nullable().optional(),
);

export const insertExercisePayloadSchema = z.object({
    exercise_template_id: z.string().min(1).describe("ID from getExerciseList."),
    title: z.string().optional().describe("Optional; server resolves canonical title from template ID."),
    notes: z.string().optional(),
    rest_seconds: restSecondsFieldSchema,
    sets: z
        .array(hevySetSchema)
        .min(1)
        .describe(
            "At least one set in order. Index is assigned from array position (0-based). Use explicit nulls for unused metrics.",
        ),
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

export function toHevyExercise(exercise: TZodHevyExercise, arrayIndex: number): THevyExercise {
    return {
        index: arrayIndex,
        title: exercise.title,
        notes: exercise.notes,
        rest_seconds: exercise.rest_seconds ?? null,
        exercise_template_id: exercise.exercise_template_id,
        supersets_id: exercise.supersets_id ?? null,
        sets: exercise.sets.map((set, setIndex) => toHevySet(set, setIndex)),
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
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
});

export const editDayTitleSchema = z.object({
    op: z.literal("edit_day_title"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    title: z.string(),
});

export const addDayNotesSchema = z.object({
    op: z.literal("add_day_notes"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    notes: z.string(),
});

export const deleteWeekSchema = z.object({
    op: z.literal("delete_week"),
    folderIds: singleFolderIdsSchema,
});

export const insertExerciseSchema = z.object({
    op: z.literal("insert_exercise"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    exercise: insertExercisePayloadSchema,
});

export const editExerciseSchema = z.object({
    op: z.literal("edit_exercise"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    exercise: insertExercisePayloadSchema,
});

export const deleteExerciseSchema = z.object({
    op: z.literal("delete_exercise"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
});

export const updateSetSchema = z.object({
    op: z.literal("update_set"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    setIndex: setIndexSchema,
    set: hevySetPatchSchema,
});

export const addExerciseNotesSchema = z.object({
    op: z.literal("add_exercise_notes"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndex: exerciseIndexSchema,
    notes: z.string(),
});

export const createSupersetSchema = z.object({
    op: z.literal("create_superset"),
    folderIds: folderIdsSchema.optional(),
    dayOrder: dayOrderSchema,
    exerciseIndexes: z.array(exerciseIndexSchema).min(2),
});

export const removeFromSupersetSchema = z.object({
    op: z.literal("remove_from_superset"),
    folderIds: folderIdsSchema.optional(),
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
    routine: z.preprocess(
        normalizeHevyApiRoutineForAddDay,
        z.object({
            exercises: z.array(hevyExerciseSchema),
            title: z.string(),
            notes: z.string(),
        }),
    ),
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
