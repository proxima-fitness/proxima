import { z } from "zod";

const folderIdsSchema = z.array(z.number().int().nonnegative()).min(1);
const singleFolderIdsSchema = z.array(z.number().int().nonnegative()).length(1);
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

const insertExercisePayloadSchema = z.object({
    exercise_template_id: z.string().min(1),
    title: z.string(),
    notes: z.string().optional(),
    rest_seconds: z.string().nullable().optional(),
    sets: z.array(hevySetSchema).min(1),
    supersets_id: z.number().nullable().optional(),
    reason: z.string().optional(),
});

export type TInsertExercisePayload = z.infer<typeof insertExercisePayloadSchema>;

const hevyExerciseTemplateSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    primary_muscle_group: z.string(),
    secondary_muscle_groups: z.array(z.string()),
    is_custom: z.boolean(),
    equipment: z.string(),
    normalized_title: z.string(),
    gif_id: z.string(),
    instructions: z.array(z.string()),
});

const hevyAddExerciseSchema = z.object({
    selectedExercise: hevyExerciseTemplateSchema,
    repTypeValue: z.enum(["reps", "reps_range", "distance_meters", "duration_seconds", "custom_metric"]),
    reps: z.array(z.number()).nullable(),
    repRangeStart: z.array(z.number()).nullable().optional(),
    repRangeEnd: z.array(z.number()).nullable().optional(),
    weightKg: z.array(z.number().nullable()).nullable(),
    rpe: z.array(z.number().nullable()).nullable(),
    setTypes: z.array(z.enum(["normal", "warmup", "dropset", "failure"])),
    restSeconds: z.string().nullable(),
});

export type THevyAddExerciseInput = z.infer<typeof hevyAddExerciseSchema>;

export function toHevyAddExercise(input: THevyAddExerciseInput): THevyAddExercise {
    return {
        selectedExercise: input.selectedExercise,
        repTypeValue: input.repTypeValue,
        reps: input.reps ?? null,
        repRangeStart: input.repRangeStart,
        repRangeEnd: input.repRangeEnd,
        weightKg: input.weightKg ?? null,
        rpe: input.rpe ?? null,
        setTypes: input.setTypes,
        restSeconds: input.restSeconds ?? null,
    };
}

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

export const addDaySchema = z.object({
    op: z.literal("add_day"),
    folderIds: singleFolderIdsSchema,
});

export const deleteDaySchema = z.object({
    op: z.literal("delete_day"),
    dayId: z.string().min(1),
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
    exercise: hevyAddExerciseSchema,
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
    dayId: z.string().min(1),
    exerciseIndexes: z.array(exerciseIndexSchema).min(2),
});

export const removeFromSupersetSchema = z.object({
    op: z.literal("remove_from_superset"),
    dayId: z.string().min(1),
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
