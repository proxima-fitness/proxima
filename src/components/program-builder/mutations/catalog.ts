import { defineProgramMutation } from "./defineProgramMutation";
import {
    addDay,
    addDayNotes,
    addExerciseNote,
    addRoutineAsDay,
    createSuperset,
    deleteDay,
    deleteExercise,
    deleteWeek,
    duplicateDay,
    duplicateWeek,
    editDayTitle,
    editExercise,
    insertExercise,
    removeFromSuperset,
    reorderDayInWeek,
    swapExerciseTemplate,
    updateSet,
} from "./handlers";
import {
    addDayNotesSchema,
    addDaySchema,
    addExerciseNotesSchema,
    addRoutineAsDaySchema,
    createSupersetSchema,
    deleteDaySchema,
    deleteExerciseSchema,
    deleteWeekSchema,
    duplicateDaySchema,
    duplicateWeekSchema,
    editDayTitleSchema,
    editExerciseSchema,
    insertExercisePayloadSchema,
    insertExerciseSchema,
    removeFromSupersetSchema,
    reorderDayInWeekSchema,
    swapExerciseTemplateMinimalToSchema,
    swapExerciseTemplateSchema,
    toHevyExercise,
    updateSetSchema,
} from "./schemas";
import {
    mutationFailure,
    mutationSuccess,
    type TMutationResult,
    type TProgramMutationDefinition,
} from "./types";

function weekFullResult(program: THevyRoutine[], next: THevyRoutine[]): TMutationResult {
    if (next === program) {
        return mutationFailure("Maximum 7 days per week");
    }
    return mutationSuccess(next);
}

export const programMutationCatalog: TProgramMutationDefinition[] = [
    defineProgramMutation({
        id: "insert_exercise",
        description: "Insert an exercise at a 0-based index on one or more days.",
        schema: insertExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                insertExercise(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.exercise,
                ),
            ),
    }),
    defineProgramMutation({
        id: "edit_exercise",
        description:
            "Replace an exercise at a 0-based index using grid payload (exercise_template_id, sets[], rest_seconds, optional title/reason) — same shape as insert_exercise.",
        schema: editExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                editExercise(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.exercise,
                ),
            ),
    }),
    defineProgramMutation({
        id: "swap_exercise_template",
        description:
            "Bulk-replace exercises matching from_exercise_template_id. Omit folderIds/dayOrder for all weeks/days. preserve_sets (default true) keeps sets/rest/notes; false replaces full exercise from to payload.",
        schema: swapExerciseTemplateSchema,
        run: (program, args) => {
            const preserveSets = args.preserve_sets ?? true;
            const toParsed = preserveSets
                ? swapExerciseTemplateMinimalToSchema.safeParse(args.to)
                : insertExercisePayloadSchema.safeParse(args.to);
            if (!toParsed.success) {
                return mutationFailure(
                    toParsed.error.issues.map((issue) => issue.message).join("; "),
                );
            }

            const { program: nextProgram, matchCount } = swapExerciseTemplate(
                program,
                args.from_exercise_template_id,
                toParsed.data,
                {
                    folderIds: args.folderIds,
                    dayOrder: args.dayOrder,
                    preserveSets,
                },
            );
            if (matchCount === 0) {
                return mutationFailure(
                    `No exercise matched from_exercise_template_id ${args.from_exercise_template_id}`,
                );
            }
            return mutationSuccess(nextProgram);
        },
    }),
    defineProgramMutation({
        id: "delete_exercise",
        description: "Remove an exercise by 0-based index.",
        schema: deleteExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                deleteExercise(program, args.folderIds, args.dayOrder, args.exerciseIndex),
            ),
    }),
    defineProgramMutation({
        id: "update_set",
        description: "Patch fields on a single set row.",
        schema: updateSetSchema,
        run: (program, args) =>
            mutationSuccess(
                updateSet(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.setIndex,
                    args.set,
                ),
            ),
    }),
    defineProgramMutation({
        id: "edit_day_title",
        description: "Set the day title on one or more matching days.",
        schema: editDayTitleSchema,
        run: (program, args) =>
            mutationSuccess(
                editDayTitle(program, args.folderIds, args.dayOrder, args.title),
            ),
    }),
    defineProgramMutation({
        id: "add_day_notes",
        description: "Set routine notes on one or more matching days.",
        schema: addDayNotesSchema,
        run: (program, args) =>
            mutationSuccess(
                addDayNotes(program, args.folderIds, args.dayOrder, args.notes),
            ),
    }),
    defineProgramMutation({
        id: "add_exercise_notes",
        description: "Set notes on a single exercise.",
        schema: addExerciseNotesSchema,
        run: (program, args) =>
            mutationSuccess(
                addExerciseNote(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.notes,
                ),
            ),
    }),
    defineProgramMutation({
        id: "delete_day",
        description:
            "Remove one or more days by week and day order. Args: folderIds (0-based week), dayOrder (1-based day).",
        schema: deleteDaySchema,
        run: (program, args) =>
            mutationSuccess(deleteDay(program, args.folderIds, args.dayOrder)),
    }),
    defineProgramMutation({
        id: "add_day",
        description:
            "Append an empty day to a week. Args: folderIds: [weekIndex] (0-based, same as routine folder_id).",
        schema: addDaySchema,
        run: (program, args) =>
            weekFullResult(program, addDay(program, args.folderIds[0])),
    }),
    defineProgramMutation({
        id: "delete_week",
        description:
            "Remove one week and reindex later weeks. Args: folderIds: [weekIndex] (0-based). " +
            "One op per week; when shortening, delete highest weekIndex first (e.g. 8→4 wk: [7], [6], [5], [4]).",
        schema: deleteWeekSchema,
        run: (program, args) =>
            mutationSuccess(deleteWeek(program, args.folderIds[0])),
    }),
    defineProgramMutation({
        id: "create_superset",
        description:
            "Group two or more exercises into a superset on matching days. Args: folderIds, dayOrder, exerciseIndexes (0-based, min 2).",
        schema: createSupersetSchema,
        run: (program, args) =>
            mutationSuccess(
                createSuperset(program, args.folderIds, args.dayOrder, args.exerciseIndexes),
            ),
    }),
    defineProgramMutation({
        id: "remove_from_superset",
        description:
            "Remove one exercise from its superset on matching days. Args: folderIds, dayOrder, exerciseIndex (0-based).",
        schema: removeFromSupersetSchema,
        run: (program, args) =>
            mutationSuccess(
                removeFromSuperset(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                ),
            ),
    }),
    defineProgramMutation({
        id: "duplicate_week",
        description: "Copy all days from one week into other weeks.",
        schema: duplicateWeekSchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                duplicateWeek(program, args.fromWeekIndex, args.toWeekIndexes),
            ),
    }),
    defineProgramMutation({
        id: "duplicate_day",
        description: "Copy one day into other day slots on a target week.",
        schema: duplicateDaySchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                duplicateDay(
                    program,
                    args.fromWeekIndex,
                    args.fromDayOrder,
                    args.toWeekIndex,
                    args.toDayOrders,
                ),
            ),
    }),
    defineProgramMutation({
        id: "reorder_day_in_week",
        description: "Move a day within a week before another day or to the end.",
        schema: reorderDayInWeekSchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                reorderDayInWeek(program, args.folderId, args.dayId, args.beforeDayId),
            ),
    }),
    defineProgramMutation({
        id: "add_routine_as_day",
        description: "Append a copied routine as a new day in a week.",
        schema: addRoutineAsDaySchema,
        agentExposed: false,
        run: (program, args) =>
            weekFullResult(
                program,
                addRoutineAsDay(
                    program,
                    {
                        ...args.routine,
                        exercises: args.routine.exercises.map(toHevyExercise),
                    },
                    args.folderIds[0],
                ),
            ),
    }),
];

export const programMutationCatalogById = Object.fromEntries(
    programMutationCatalog.map((mutation) => [mutation.id, mutation]),
) as Record<string, TProgramMutationDefinition>;

export const agentExposedMutations = programMutationCatalog.filter(
    (mutation) => mutation.agentExposed,
);
